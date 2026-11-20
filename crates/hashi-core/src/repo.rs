use crate::db::Database;
use crate::error::{CoreError, CoreResult};
use crate::media::{compute_storage_stats, save_media_file};
use crate::models::*;
use chrono::{DateTime, FixedOffset, NaiveDate, Utc};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIdeaInput {
    pub title: Option<String>,
    pub raw_text: String,
    pub tags: Vec<String>,
    pub tz_offset_minutes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateIdeaInput {
    pub id: String,
    pub title: Option<String>,
    pub raw_text: String,
    pub tags: Vec<String>,
    #[serde(default)]
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateManualMealInput {
    pub meal_type: String,
    pub user_note: String,
    pub calories: u32,
    pub protein: u32,
    pub carbs: u32,
    pub fat: u32,
    pub thumbnail_b64: Option<String>,
    pub tz_offset_minutes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMealInput {
    pub meal_type: String,
    pub user_note: Option<String>,
    pub manual_calories: Option<u32>,
    pub photo_bytes: Option<Vec<u8>>,
    pub photo_ext: Option<String>,
    pub thumbnail_b64: Option<String>,
    pub tz_offset_minutes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVoiceInput {
    pub duration_seconds: u32,
    pub audio_bytes: Option<Vec<u8>>,
    pub audio_ext: Option<String>,
    pub tz_offset_minutes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkoutInput {
    pub workout_type: String,
    pub duration_minutes: u32,
    pub details_json: Option<String>,
    pub notes: Option<String>,
    pub tz_offset_minutes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogReadingInput {
    pub book_id: String,
    pub date: String,
    pub pages_read: u32,
    pub minutes_read: u32,
}

fn now_utc() -> String {
    Utc::now().to_rfc3339()
}

fn local_date_from_utc(rfc3339: &str, tz_offset_minutes: i32) -> String {
    if let Ok(dt) = DateTime::parse_from_rfc3339(rfc3339) {
        if let Some(offset) = FixedOffset::east_opt(tz_offset_minutes * 60) {
            return dt.with_timezone(&offset).format("%Y-%m-%d").to_string();
        }
        return dt.format("%Y-%m-%d").to_string();
    }
    rfc3339.chars().take(10).collect()
}

impl Database {
    fn sync_fts(
        &self,
        record_id: &str,
        record_type: &str,
        title: &str,
        body: &str,
        tags: &str,
    ) -> CoreResult<()> {
        self.conn.execute(
            "DELETE FROM search_fts WHERE record_id = ?1",
            params![record_id],
        )?;
        self.conn.execute(
            "INSERT INTO search_fts (record_id, record_type, title, body, tags) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![record_id, record_type, title, body, tags],
        )?;
        Ok(())
    }

    fn delete_fts(&self, record_id: &str) -> CoreResult<()> {
        self.conn.execute(
            "DELETE FROM search_fts WHERE record_id = ?1",
            params![record_id],
        )?;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // Ideas
    // -------------------------------------------------------------------------

    pub fn create_idea(&self, input: CreateIdeaInput) -> CoreResult<Idea> {
        let raw_text = input.raw_text.trim().to_string();
        if raw_text.is_empty() {
            return Err(CoreError::Validation("Idea text cannot be empty".into()));
        }

        let id = Uuid::new_v4().to_string();
        let now = now_utc();
        let title = input
            .title
            .map(|t| t.trim().to_string())
            .filter(|t| !t.is_empty());
        let tags: Vec<String> = input
            .tags
            .into_iter()
            .map(|t| t.trim().to_lowercase())
            .filter(|t| !t.is_empty())
            .collect();
        let tags_json = serde_json::to_string(&tags)?;

        self.conn.execute(
            "INSERT INTO ideas (
                id, created_at, updated_at, device_id, dirty, deleted_at, version,
                tz_offset_minutes, title, raw_text, structured_bullets, tags, status
            ) VALUES (?1, ?2, ?2, ?3, 1, NULL, 1, ?4, ?5, ?6, NULL, ?7, 'raw')",
            params![
                id,
                now,
                self.device_id,
                input.tz_offset_minutes,
                title,
                raw_text,
                tags_json,
            ],
        )?;

        let rev_id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO idea_revisions (id, idea_id, rev_type, content, timestamp)
             VALUES (?1, ?2, 'base', ?3, ?4)",
            params![rev_id, id, raw_text, now],
        )?;

        self.sync_fts(
            &id,
            "idea",
            title.as_deref().unwrap_or(""),
            &raw_text,
            &tags.join(" "),
        )?;

        self.get_idea(&id)?
            .ok_or_else(|| CoreError::NotFound(id))
    }

    pub fn get_idea(&self, id: &str) -> CoreResult<Option<Idea>> {
        let row = self
            .conn
            .query_row(
                "SELECT id, created_at, updated_at, device_id, dirty, deleted_at, version,
                        tz_offset_minutes, title, raw_text, structured_bullets, tags, status
                 FROM ideas
                 WHERE id = ?1 AND deleted_at IS NULL",
                params![id],
                parse_idea_row,
            )
            .optional()?;
        Ok(row)
    }

    pub fn list_ideas(
        &self,
        search: Option<&str>,
        tag: Option<&str>,
        status: Option<&str>,
    ) -> CoreResult<Vec<Idea>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, created_at, updated_at, device_id, dirty, deleted_at, version,
                    tz_offset_minutes, title, raw_text, structured_bullets, tags, status
             FROM ideas
             WHERE deleted_at IS NULL
             ORDER BY updated_at DESC",
        )?;
        let iter = stmt.query_map([], parse_idea_row)?;
        let search_l = search.map(|s| s.trim().to_lowercase()).filter(|s| !s.is_empty());
        let tag_l = tag.map(|s| s.trim().to_lowercase()).filter(|s| !s.is_empty() && s != "all");
        let status_l = status.map(|s| s.trim().to_lowercase()).filter(|s| !s.is_empty() && s != "all");

        let mut results = Vec::new();
        for item in iter {
            let idea = item?;
            if let Some(ref st) = status_l {
                if idea.status.as_str() != st {
                    continue;
                }
            }
            if let Some(ref tg) = tag_l {
                if !idea.tags.iter().any(|t| t.eq_ignore_ascii_case(tg)) {
                    continue;
                }
            }
            if let Some(ref q) = search_l {
                let in_title = idea
                    .title
                    .as_deref()
                    .map(|t| t.to_lowercase().contains(q))
                    .unwrap_or(false);
                let in_text = idea.raw_text.to_lowercase().contains(q);
                let in_tags = idea.tags.iter().any(|t| t.to_lowercase().contains(q));
                if !in_title && !in_text && !in_tags {
                    continue;
                }
            }
            results.push(idea);
        }
        Ok(results)
    }

    pub fn update_idea(&self, input: UpdateIdeaInput) -> CoreResult<Idea> {
        let existing = self
            .get_idea(&input.id)?
            .ok_or_else(|| CoreError::NotFound(input.id.clone()))?;

        let raw_text = input.raw_text.trim().to_string();
        if raw_text.is_empty() {
            return Err(CoreError::Validation("Idea text cannot be empty".into()));
        }

        let now = now_utc();
        let title = input
            .title
            .map(|t| t.trim().to_string())
            .filter(|t| !t.is_empty());
        let tags: Vec<String> = input
            .tags
            .into_iter()
            .map(|t| t.trim().to_lowercase())
            .filter(|t| !t.is_empty())
            .collect();
        let tags_json = serde_json::to_string(&tags)?;
        let next_version = existing.sync.version + 1;

        let status_str = input
            .status
            .as_deref()
            .map(|s| IdeaStatus::from_str(s).as_str().to_string())
            .unwrap_or_else(|| existing.status.as_str().to_string());

        self.conn.execute(
            "UPDATE ideas
             SET updated_at = ?1, dirty = 1, version = ?2, title = ?3, raw_text = ?4, tags = ?5, status = ?6
             WHERE id = ?7 AND deleted_at IS NULL",
            params![now, next_version, title, raw_text, tags_json, status_str, input.id],
        )?;

        let rev_id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO idea_revisions (id, idea_id, rev_type, content, timestamp)
             VALUES (?1, ?2, 'edit', ?3, ?4)",
            params![rev_id, input.id, raw_text, now],
        )?;

        self.sync_fts(
            &input.id,
            "idea",
            title.as_deref().unwrap_or(""),
            &raw_text,
            &tags.join(" "),
        )?;

        self.get_idea(&input.id)?
            .ok_or_else(|| CoreError::NotFound(input.id))
    }

    pub fn delete_idea(&self, id: &str) -> CoreResult<()> {
        let now = now_utc();
        let changed = self.conn.execute(
            "UPDATE ideas
             SET deleted_at = ?1, updated_at = ?1, dirty = 1, version = version + 1
             WHERE id = ?2 AND deleted_at IS NULL",
            params![now, id],
        )?;
        if changed == 0 {
            return Err(CoreError::NotFound(id.into()));
        }
        self.delete_fts(id)?;
        Ok(())
    }

    pub fn set_idea_status(&self, id: &str, status: &str) -> CoreResult<Idea> {
        let existing = self
            .get_idea(id)?
            .ok_or_else(|| CoreError::NotFound(id.to_string()))?;

        let status_norm = IdeaStatus::from_str(status).as_str();
        let now = now_utc();
        let next_version = existing.sync.version + 1;

        self.conn.execute(
            "UPDATE ideas
             SET updated_at = ?1, dirty = 1, version = ?2, status = ?3
             WHERE id = ?4 AND deleted_at IS NULL",
            params![now, next_version, status_norm, id],
        )?;

        self.get_idea(id)?
            .ok_or_else(|| CoreError::NotFound(id.to_string()))
    }

    pub fn list_idea_revisions(&self, idea_id: &str) -> CoreResult<Vec<IdeaRevision>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, idea_id, rev_type, content, timestamp
             FROM idea_revisions
             WHERE idea_id = ?1
             ORDER BY timestamp DESC",
        )?;
        let rows = stmt.query_map(params![idea_id], |row| {
            let rt: String = row.get(2)?;
            Ok(IdeaRevision {
                id: row.get(0)?,
                idea_id: row.get(1)?,
                rev_type: RevisionType::from_str(&rt),
                content: row.get(3)?,
                timestamp: row.get(4)?,
            })
        })?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        Ok(out)
    }

    // -------------------------------------------------------------------------
    // Meals
    // -------------------------------------------------------------------------

    pub fn create_meal(&self, input: CreateMealInput) -> CoreResult<Meal> {
        let id = Uuid::new_v4().to_string();
        let now = now_utc();
        let meal_type = MealType::from_str(&input.meal_type);
        let user_note = input
            .user_note
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());

        let (photo_path, photo_sha256) = if let Some(bytes) = input.photo_bytes.as_deref() {
            if !bytes.is_empty() {
                let ext = input.photo_ext.as_deref().unwrap_or("jpg");
                let saved = save_media_file(&self.media_dir, "meals", &id, ext, bytes)?;
                (Some(saved.relative_path), Some(saved.sha256))
            } else {
                (None, None)
            }
        } else {
            (None, None)
        };

        let total_kcal = input.manual_calories.unwrap_or(0);
        let user_edited = if input.manual_calories.is_some() { 1 } else { 0 };

        self.conn.execute(
            "INSERT INTO meals (
                id, created_at, updated_at, device_id, dirty, deleted_at, version,
                captured_at, tz_offset_minutes, meal_type, photo_path, photo_sha256,
                thumbnail_b64, user_note, manual_calories, food_items, total_kcal,
                total_protein, total_carbs, total_fat, confidence, user_edited, status
            ) VALUES (
                ?1, ?2, ?2, ?3, 1, NULL, 1,
                ?2, ?4, ?5, ?6, ?7,
                ?8, ?9, ?10, '[]', ?11,
                0.0, 0.0, 0.0, NULL, ?12, 'pending'
            )",
            params![
                id,
                now,
                self.device_id,
                input.tz_offset_minutes,
                meal_type.as_str(),
                photo_path,
                photo_sha256,
                input.thumbnail_b64,
                user_note,
                input.manual_calories,
                total_kcal,
                user_edited,
            ],
        )?;

        self.sync_fts(
            &id,
            "meal",
            meal_type.as_str(),
            user_note.as_deref().unwrap_or("Meal"),
            meal_type.as_str(),
        )?;

        self.get_meal(&id)?
            .ok_or_else(|| CoreError::NotFound(id))
    }

    pub fn get_meal(&self, id: &str) -> CoreResult<Option<Meal>> {
        let row = self
            .conn
            .query_row(
                "SELECT id, created_at, updated_at, device_id, dirty, deleted_at, version,
                        captured_at, tz_offset_minutes, meal_type, photo_path, photo_sha256,
                        thumbnail_b64, user_note, manual_calories, food_items, total_kcal,
                        total_protein, total_carbs, total_fat, confidence, user_edited, status
                 FROM meals
                 WHERE id = ?1 AND deleted_at IS NULL",
                params![id],
                parse_meal_row,
            )
            .optional()?;
        Ok(row)
    }

    pub fn list_meals(&self, date: Option<&str>) -> CoreResult<Vec<Meal>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, created_at, updated_at, device_id, dirty, deleted_at, version,
                    captured_at, tz_offset_minutes, meal_type, photo_path, photo_sha256,
                    thumbnail_b64, user_note, manual_calories, food_items, total_kcal,
                    total_protein, total_carbs, total_fat, confidence, user_edited, status
             FROM meals
             WHERE deleted_at IS NULL
             ORDER BY captured_at DESC",
        )?;
        let rows = stmt.query_map([], parse_meal_row)?;
        let mut out = Vec::new();
        for r in rows {
            let meal = r?;
            if let Some(d) = date {
                if local_date_from_utc(&meal.captured_at, meal.tz_offset_minutes) != d {
                    continue;
                }
            }
            out.push(meal);
        }
        Ok(out)
    }

    pub fn create_manual_meal(&self, input: CreateManualMealInput) -> CoreResult<Meal> {
        let id = Uuid::new_v4().to_string();
        let now = now_utc();
        let meal_type = MealType::from_str(&input.meal_type);
        let note = input.user_note.trim().to_string();

        self.conn.execute(
            "INSERT INTO meals (
                id, created_at, updated_at, device_id, dirty, deleted_at, version,
                captured_at, tz_offset_minutes, meal_type, photo_path, photo_sha256,
                thumbnail_b64, user_note, manual_calories, food_items, total_kcal,
                total_protein, total_carbs, total_fat, confidence, user_edited, status
            ) VALUES (
                ?1, ?2, ?2, ?3, 1, NULL, 1,
                ?2, ?4, ?5, NULL, NULL,
                ?6, ?7, ?8, '[]', ?8,
                ?9, ?10, ?11, 1.0, 1, 'processed'
            )",
            params![
                id,
                now,
                self.device_id,
                input.tz_offset_minutes,
                meal_type.as_str(),
                input.thumbnail_b64,
                note,
                input.calories,
                input.protein,
                input.carbs,
                input.fat,
            ],
        )?;

        self.sync_fts(&id, "meal", &note, &format!("{} kcal", input.calories), meal_type.as_str())?;

        self.get_meal(&id)?
            .ok_or_else(|| CoreError::NotFound(id))
    }

    pub fn delete_meal(&self, id: &str) -> CoreResult<()> {
        let now = now_utc();
        let changed = self.conn.execute(
            "UPDATE meals
             SET deleted_at = ?1, updated_at = ?1, dirty = 1, version = version + 1
             WHERE id = ?2 AND deleted_at IS NULL",
            params![now, id],
        )?;
        if changed == 0 {
            return Err(CoreError::NotFound(id.into()));
        }
        self.delete_fts(id)?;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // Voice Journal
    // -------------------------------------------------------------------------

    pub fn create_voice_journal(&self, input: CreateVoiceInput) -> CoreResult<VoiceJournalEntry> {
        if input.duration_seconds == 0 || input.duration_seconds > 60 {
            return Err(CoreError::Validation(
                "Voice journal duration must be between 1 and 60 seconds".into(),
            ));
        }

        let id = Uuid::new_v4().to_string();
        let now = now_utc();

        let (audio_file_path, audio_sha256) = if let Some(bytes) = input.audio_bytes.as_deref() {
            if !bytes.is_empty() {
                let ext = input.audio_ext.as_deref().unwrap_or("opus");
                let saved = save_media_file(&self.media_dir, "audio", &id, ext, bytes)?;
                (Some(saved.relative_path), Some(saved.sha256))
            } else {
                (None, None)
            }
        } else {
            (None, None)
        };

        self.conn.execute(
            "INSERT INTO voice_journal_entries (
                id, created_at, updated_at, device_id, dirty, deleted_at, version,
                recorded_at, tz_offset_minutes, duration_seconds, audio_file_path,
                audio_sha256, transcript, edited_transcript, summary_bullets, status
            ) VALUES (
                ?1, ?2, ?2, ?3, 1, NULL, 1,
                ?2, ?4, ?5, ?6,
                ?7, NULL, NULL, NULL, 'pending'
            )",
            params![
                id,
                now,
                self.device_id,
                input.tz_offset_minutes,
                input.duration_seconds,
                audio_file_path,
                audio_sha256,
            ],
        )?;

        self.get_voice_journal(&id)?
            .ok_or_else(|| CoreError::NotFound(id))
    }

    pub fn get_voice_journal(&self, id: &str) -> CoreResult<Option<VoiceJournalEntry>> {
        let row = self
            .conn
            .query_row(
                "SELECT id, created_at, updated_at, device_id, dirty, deleted_at, version,
                        recorded_at, tz_offset_minutes, duration_seconds, audio_file_path,
                        audio_sha256, transcript, edited_transcript, summary_bullets, status
                 FROM voice_journal_entries
                 WHERE id = ?1 AND deleted_at IS NULL",
                params![id],
                parse_voice_row,
            )
            .optional()?;
        Ok(row)
    }

    pub fn list_voice_journals(&self, date: Option<&str>) -> CoreResult<Vec<VoiceJournalEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, created_at, updated_at, device_id, dirty, deleted_at, version,
                    recorded_at, tz_offset_minutes, duration_seconds, audio_file_path,
                    audio_sha256, transcript, edited_transcript, summary_bullets, status
             FROM voice_journal_entries
             WHERE deleted_at IS NULL
             ORDER BY recorded_at DESC",
        )?;
        let rows = stmt.query_map([], parse_voice_row)?;
        let mut out = Vec::new();
        for r in rows {
            let v = r?;
            if let Some(d) = date {
                if local_date_from_utc(&v.recorded_at, v.tz_offset_minutes) != d {
                    continue;
                }
            }
            out.push(v);
        }
        Ok(out)
    }

    pub fn delete_voice_journal(&self, id: &str) -> CoreResult<()> {
        let now = now_utc();
        let changed = self.conn.execute(
            "UPDATE voice_journal_entries
             SET deleted_at = ?1, updated_at = ?1, dirty = 1, version = version + 1
             WHERE id = ?2 AND deleted_at IS NULL",
            params![now, id],
        )?;
        if changed == 0 {
            return Err(CoreError::NotFound(id.into()));
        }
        self.delete_fts(id)?;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // Habits & Checks
    // -------------------------------------------------------------------------

    pub fn create_habit(&self, name: &str) -> CoreResult<Habit> {
        let name = name.trim();
        if name.is_empty() {
            return Err(CoreError::Validation("Habit name cannot be empty".into()));
        }
        let id = Uuid::new_v4().to_string();
        let now = now_utc();
        let max_order: i32 = self
            .conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) FROM habits WHERE deleted_at IS NULL",
                [],
                |row| row.get(0),
            )?;

        self.conn.execute(
            "INSERT INTO habits (
                id, created_at, updated_at, device_id, dirty, deleted_at, version,
                name, schedule, sort_order, archived
            ) VALUES (?1, ?2, ?2, ?3, 1, NULL, 1, ?4, 'daily', ?5, 0)",
            params![id, now, self.device_id, name, max_order + 1],
        )?;

        let habit = self.conn.query_row(
            "SELECT id, created_at, updated_at, device_id, dirty, deleted_at, version,
                    name, schedule, sort_order, archived
             FROM habits WHERE id = ?1",
            params![id],
            parse_habit_row,
        )?;
        Ok(habit)
    }

    pub fn rename_habit(&self, id: &str, name: &str) -> CoreResult<()> {
        let name = name.trim();
        if name.is_empty() {
            return Err(CoreError::Validation("Habit name cannot be empty".into()));
        }
        let now = now_utc();
        let changed = self.conn.execute(
            "UPDATE habits SET name = ?1, updated_at = ?2, dirty = 1, version = version + 1
             WHERE id = ?3 AND deleted_at IS NULL",
            params![name, now, id],
        )?;
        if changed == 0 {
            return Err(CoreError::NotFound(id.into()));
        }
        Ok(())
    }

    pub fn reorder_habits(&self, ordered_ids: &[String]) -> CoreResult<()> {
        let now = now_utc();
        for (idx, id) in ordered_ids.iter().enumerate() {
            self.conn.execute(
                "UPDATE habits SET sort_order = ?1, updated_at = ?2, dirty = 1, version = version + 1
                 WHERE id = ?3 AND deleted_at IS NULL",
                params![idx as i32, now, id],
            )?;
        }
        Ok(())
    }

    pub fn archive_habit(&self, id: &str, archived: bool) -> CoreResult<()> {
        let now = now_utc();
        let changed = self.conn.execute(
            "UPDATE habits SET archived = ?1, updated_at = ?2, dirty = 1, version = version + 1
             WHERE id = ?3 AND deleted_at IS NULL",
            params![if archived { 1 } else { 0 }, now, id],
        )?;
        if changed == 0 {
            return Err(CoreError::NotFound(id.into()));
        }
        Ok(())
    }

    pub fn list_habits_for_date(&self, date: &str) -> CoreResult<Vec<HabitWithStatus>> {
        let mut stmt = self.conn.prepare(
            "SELECT h.id, h.name, h.schedule, h.sort_order, h.archived,
                    COALESCE(c.done, 0)
             FROM habits h
             LEFT JOIN habit_checks c
               ON c.habit_id = h.id AND c.date = ?1 AND c.deleted_at IS NULL
             WHERE h.deleted_at IS NULL AND h.archived = 0
             ORDER BY h.sort_order ASC, h.created_at ASC",
        )?;
        let rows = stmt.query_map(params![date], |row| {
            let archived: i32 = row.get(4)?;
            let done: i32 = row.get(5)?;
            Ok(HabitWithStatus {
                id: row.get(0)?,
                name: row.get(1)?,
                schedule: row.get(2)?,
                sort_order: row.get(3)?,
                archived: archived != 0,
                done: done != 0,
            })
        })?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        Ok(out)
    }

    pub fn toggle_habit_check(&self, habit_id: &str, date: &str) -> CoreResult<bool> {
        let now = now_utc();
        let existing: Option<(String, i32)> = self
            .conn
            .query_row(
                "SELECT id, done FROM habit_checks WHERE habit_id = ?1 AND date = ?2",
                params![habit_id, date],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()?;

        if let Some((check_id, done)) = existing {
            let next_done = if done == 0 { 1 } else { 0 };
            self.conn.execute(
                "UPDATE habit_checks
                 SET done = ?1, updated_at = ?2, dirty = 1, deleted_at = NULL, version = version + 1
                 WHERE id = ?3",
                params![next_done, now, check_id],
            )?;
            Ok(next_done != 0)
        } else {
            let check_id = Uuid::new_v4().to_string();
            self.conn.execute(
                "INSERT INTO habit_checks (
                    id, created_at, updated_at, device_id, dirty, deleted_at, version,
                    habit_id, date, done
                ) VALUES (?1, ?2, ?2, ?3, 1, NULL, 1, ?4, ?5, 1)",
                params![check_id, now, self.device_id, habit_id, date],
            )?;
            Ok(true)
        }
    }

    pub fn habit_streak_days(&self, today: &str) -> CoreResult<u32> {
        let active_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM habits WHERE deleted_at IS NULL AND archived = 0",
            [],
            |r| r.get(0),
        )?;
        if active_count == 0 {
            return Ok(0);
        }

        let start = NaiveDate::parse_from_str(today, "%Y-%m-%d")
            .unwrap_or_else(|_| Utc::now().date_naive());

        let mut streak = 0u32;
        let mut cursor = start;
        loop {
            let ds = cursor.format("%Y-%m-%d").to_string();
            let done_count: i64 = self.conn.query_row(
                "SELECT COUNT(*) FROM habit_checks c
                 JOIN habits h ON h.id = c.habit_id
                 WHERE c.date = ?1 AND c.done = 1 AND c.deleted_at IS NULL
                   AND h.deleted_at IS NULL AND h.archived = 0",
                params![ds],
                |r| r.get(0),
            )?;
            if done_count >= active_count {
                streak += 1;
                match cursor.pred_opt() {
                    Some(prev) => cursor = prev,
                    None => break,
                }
            } else {
                // If today isn't finished yet, check if yesterday's streak is alive
                if cursor == start {
                    match cursor.pred_opt() {
                        Some(prev) => {
                            cursor = prev;
                            continue;
                        }
                        None => break,
                    }
                }
                break;
            }
        }
        Ok(streak)
    }

    // -------------------------------------------------------------------------
    // Books & Reading
    // -------------------------------------------------------------------------

    pub fn create_book(&self, title: &str, total_pages: Option<u32>) -> CoreResult<Book> {
        let title = title.trim();
        if title.is_empty() {
            return Err(CoreError::Validation("Book title cannot be empty".into()));
        }
        let id = Uuid::new_v4().to_string();
        let now = now_utc();

        self.conn.execute(
            "INSERT INTO books (
                id, created_at, updated_at, device_id, dirty, deleted_at, version,
                title, total_pages, status
            ) VALUES (?1, ?2, ?2, ?3, 1, NULL, 1, ?4, ?5, 'reading')",
            params![id, now, self.device_id, title, total_pages],
        )?;

        let book = self.conn.query_row(
            "SELECT id, created_at, updated_at, device_id, dirty, deleted_at, version,
                    title, total_pages, status
             FROM books WHERE id = ?1",
            params![id],
            parse_book_row,
        )?;
        Ok(book)
    }

    pub fn log_reading(&self, input: LogReadingInput) -> CoreResult<ReadingLog> {
        if input.pages_read == 0 && input.minutes_read == 0 {
            return Err(CoreError::Validation(
                "Enter pages read or minutes read".into(),
            ));
        }

        let id = Uuid::new_v4().to_string();
        let now = now_utc();

        self.conn.execute(
            "INSERT INTO reading_logs (
                id, created_at, updated_at, device_id, dirty, deleted_at, version,
                book_id, date, pages_read, minutes_read
            ) VALUES (?1, ?2, ?2, ?3, 1, NULL, 1, ?4, ?5, ?6, ?7)",
            params![
                id,
                now,
                self.device_id,
                input.book_id,
                input.date,
                input.pages_read,
                input.minutes_read,
            ],
        )?;

        Ok(ReadingLog {
            sync: SyncMeta {
                id,
                created_at: now.clone(),
                updated_at: now,
                device_id: self.device_id.clone(),
                dirty: true,
                deleted_at: None,
                version: 1,
            },
            book_id: input.book_id,
            date: input.date,
            pages_read: input.pages_read,
            minutes_read: input.minutes_read,
        })
    }

    pub fn list_books_with_progress(&self, date: &str) -> CoreResult<Vec<BookProgress>> {
        let mut stmt = self.conn.prepare(
            "SELECT b.id, b.title, b.total_pages, b.status,
                    COALESCE((SELECT SUM(pages_read) FROM reading_logs r WHERE r.book_id = b.id AND r.deleted_at IS NULL), 0),
                    COALESCE((SELECT SUM(minutes_read) FROM reading_logs r WHERE r.book_id = b.id AND r.date = ?1 AND r.deleted_at IS NULL), 0),
                    COALESCE((SELECT SUM(pages_read) FROM reading_logs r WHERE r.book_id = b.id AND r.date = ?1 AND r.deleted_at IS NULL), 0)
             FROM books b
             WHERE b.deleted_at IS NULL
             ORDER BY b.updated_at DESC",
        )?;
        let rows = stmt.query_map(params![date], |row| {
            Ok(BookProgress {
                id: row.get(0)?,
                title: row.get(1)?,
                total_pages: row.get(2)?,
                status: row.get(3)?,
                pages_read_total: row.get(4)?,
                minutes_today: row.get(5)?,
                pages_today: row.get(6)?,
            })
        })?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        Ok(out)
    }

    pub fn reading_streak_days(&self, today: &str) -> CoreResult<u32> {
        let start = NaiveDate::parse_from_str(today, "%Y-%m-%d")
            .unwrap_or_else(|_| Utc::now().date_naive());

        let mut streak = 0u32;
        let mut cursor = start;
        loop {
            let ds = cursor.format("%Y-%m-%d").to_string();
            let count: i64 = self.conn.query_row(
                "SELECT COUNT(*) FROM reading_logs
                 WHERE date = ?1 AND deleted_at IS NULL AND (pages_read > 0 OR minutes_read > 0)",
                params![ds],
                |r| r.get(0),
            )?;
            if count > 0 {
                streak += 1;
                match cursor.pred_opt() {
                    Some(prev) => cursor = prev,
                    None => break,
                }
            } else {
                if cursor == start {
                    match cursor.pred_opt() {
                        Some(prev) => {
                            cursor = prev;
                            continue;
                        }
                        None => break,
                    }
                }
                break;
            }
        }
        Ok(streak)
    }

    // -------------------------------------------------------------------------
    // Workouts
    // -------------------------------------------------------------------------

    pub fn create_workout(&self, input: CreateWorkoutInput) -> CoreResult<Workout> {
        if input.duration_minutes == 0 {
            return Err(CoreError::Validation(
                "Workout duration must be greater than 0".into(),
            ));
        }

        let id = Uuid::new_v4().to_string();
        let now = now_utc();
        let wtype = WorkoutType::from_str(&input.workout_type);
        let notes = input
            .notes
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());

        self.conn.execute(
            "INSERT INTO workouts (
                id, created_at, updated_at, device_id, dirty, deleted_at, version,
                timestamp, tz_offset_minutes, workout_type, duration_minutes,
                details_json, notes, source, duplicate_link_id
            ) VALUES (
                ?1, ?2, ?2, ?3, 1, NULL, 1,
                ?2, ?4, ?5, ?6,
                ?7, ?8, 'manual', NULL
            )",
            params![
                id,
                now,
                self.device_id,
                input.tz_offset_minutes,
                wtype.as_str(),
                input.duration_minutes,
                input.details_json,
                notes,
            ],
        )?;

        let w = self.conn.query_row(
            "SELECT id, created_at, updated_at, device_id, dirty, deleted_at, version,
                    timestamp, tz_offset_minutes, workout_type, duration_minutes,
                    details_json, notes, source, duplicate_link_id
             FROM workouts WHERE id = ?1",
            params![id],
            parse_workout_row,
        )?;
        Ok(w)
    }

    pub fn list_workouts(&self, date: Option<&str>) -> CoreResult<Vec<Workout>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, created_at, updated_at, device_id, dirty, deleted_at, version,
                    timestamp, tz_offset_minutes, workout_type, duration_minutes,
                    details_json, notes, source, duplicate_link_id
             FROM workouts
             WHERE deleted_at IS NULL
             ORDER BY timestamp DESC",
        )?;
        let rows = stmt.query_map([], parse_workout_row)?;
        let mut out = Vec::new();
        for r in rows {
            let w = r?;
            if let Some(d) = date {
                if local_date_from_utc(&w.timestamp, w.tz_offset_minutes) != d {
                    continue;
                }
            }
            out.push(w);
        }
        Ok(out)
    }

    // -------------------------------------------------------------------------
    // Search & Snapshots
    // -------------------------------------------------------------------------

    pub fn search_fts(&self, query: &str) -> CoreResult<Vec<SearchHit>> {
        let cleaned = query.trim();
        if cleaned.is_empty() {
            return Ok(Vec::new());
        }
        let mut stmt = self.conn.prepare(
            "SELECT record_id, record_type, title, snippet(search_fts, 3, '', '', '...', 12)
             FROM search_fts
             WHERE search_fts MATCH ?1
             LIMIT 50",
        )?;
        let rows = stmt.query_map(params![cleaned], |row| {
            Ok(SearchHit {
                record_id: row.get(0)?,
                record_type: row.get(1)?,
                title: row.get(2)?,
                snippet: row.get(3)?,
            })
        })?;
        let mut hits = Vec::new();
        for r in rows {
            hits.push(r?);
        }
        Ok(hits)
    }

    pub fn get_pending_sync_count(&self) -> CoreResult<u32> {
        let tables = [
            "ideas",
            "voice_journal_entries",
            "meals",
            "workouts",
            "habits",
            "habit_checks",
            "books",
            "reading_logs",
        ];
        let mut total = 0u32;
        for t in tables {
            let sql = format!("SELECT COUNT(*) FROM {} WHERE dirty = 1", t);
            let c: u32 = self.conn.query_row(&sql, [], |r| r.get(0))?;
            total += c;
        }
        Ok(total)
    }

    pub fn get_home_snapshot(&self, date: &str) -> CoreResult<HomeSnapshot> {
        let meals_today = self.list_meals(Some(date))?;
        let calories_today: u32 = meals_today
            .iter()
            .map(|m| m.manual_calories.unwrap_or(m.total_kcal))
            .sum();
        let has_pending_meals = meals_today
            .iter()
            .any(|m| m.status == ProcessingStatus::Pending && m.manual_calories.is_none());

        let mut recent: Vec<RecentItem> = Vec::new();

        for m in self.list_meals(None)?.into_iter().take(5) {
            let title = m
                .user_note
                .clone()
                .unwrap_or_else(|| capitalize(m.meal_type.as_str()));
            let kcal = m.manual_calories.or(if m.total_kcal > 0 {
                Some(m.total_kcal)
            } else {
                None
            });
            let detail = match kcal {
                Some(k) => format!("{} kcal", k),
                None => "Waiting for tonight".to_string(),
            };
            recent.push(RecentItem {
                id: m.sync.id,
                kind: "meal".into(),
                title,
                detail,
                timestamp: m.captured_at,
                tz_offset_minutes: m.tz_offset_minutes,
                status: m.status.as_str().into(),
                kcal,
                duration_seconds: None,
                summary_bullets: None,
                thumbnail_b64: m.thumbnail_b64,
            });
        }

        for v in self.list_voice_journals(None)?.into_iter().take(5) {
            let title = v
                .summary_bullets
                .as_ref()
                .and_then(|b| b.first().cloned())
                .unwrap_or_else(|| "Voice note".to_string());
            let detail = if v.status == ProcessingStatus::Pending {
                "Waiting for tonight".to_string()
            } else {
                format!("0:{:02}", v.duration_seconds)
            };
            recent.push(RecentItem {
                id: v.sync.id,
                kind: "voice".into(),
                title,
                detail,
                timestamp: v.recorded_at,
                tz_offset_minutes: v.tz_offset_minutes,
                status: v.status.as_str().into(),
                kcal: None,
                duration_seconds: Some(v.duration_seconds),
                summary_bullets: v.summary_bullets,
                thumbnail_b64: None,
            });
        }

        for idea in self.list_ideas(None, None, None)?.into_iter().take(5) {
            let title = idea.title.clone().unwrap_or_else(|| idea.raw_text.clone());
            recent.push(RecentItem {
                id: idea.sync.id,
                kind: "note".into(),
                title,
                detail: idea.raw_text,
                timestamp: idea.sync.created_at,
                tz_offset_minutes: idea.tz_offset_minutes,
                status: idea.status.as_str().into(),
                kcal: None,
                duration_seconds: None,
                summary_bullets: idea.structured_bullets,
                thumbnail_b64: None,
            });
        }

        recent.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        recent.truncate(3);

        let steps_today: Option<u32> = self
            .conn
            .query_row(
                "SELECT steps FROM health_daily_metrics WHERE date = ?1 AND deleted_at IS NULL",
                params![date],
                |r| r.get(0),
            )
            .optional()?;

        Ok(HomeSnapshot {
            recent,
            calories_today,
            has_pending_meals,
            steps_today,
            reading_streak_days: self.reading_streak_days(date)?,
            habit_streak_days: self.habit_streak_days(date)?,
            pending_sync_count: self.get_pending_sync_count()?,
        })
    }

    pub fn get_health_snapshot(&self, date: &str) -> CoreResult<HealthSnapshot> {
        let meals_today = self.list_meals(Some(date))?;
        let calories_today: u32 = meals_today
            .iter()
            .map(|m| m.manual_calories.unwrap_or(m.total_kcal))
            .sum();
        let protein_today: f32 = meals_today.iter().map(|m| m.total_protein).sum();
        let carbs_today: f32 = meals_today.iter().map(|m| m.total_carbs).sum();
        let fat_today: f32 = meals_today.iter().map(|m| m.total_fat).sum();
        let has_pending_meals = meals_today
            .iter()
            .any(|m| m.status == ProcessingStatus::Pending && m.manual_calories.is_none());

        let metrics = self
            .conn
            .query_row(
                "SELECT id, created_at, updated_at, device_id, dirty, deleted_at, version,
                        date, steps, distance_meters, active_calories, sleep_minutes_total,
                        sleep_stages_json, resting_heart_rate, average_heart_rate, source
                 FROM health_daily_metrics
                 WHERE date = ?1 AND deleted_at IS NULL",
                params![date],
                parse_health_metrics_row,
            )
            .optional()?;

        let latest_weekly_report = self
            .conn
            .query_row(
                "SELECT week_start_date, exercise_analysis, volume_totals,
                        consistency_score, reading_consistency, habit_consistency
                 FROM weekly_reports
                 ORDER BY week_start_date DESC
                 LIMIT 1",
                [],
                |row| {
                    Ok(WeeklyReport {
                        week_start_date: row.get(0)?,
                        exercise_analysis: row.get(1)?,
                        volume_totals: row.get(2)?,
                        consistency_score: row.get(3)?,
                        reading_consistency: row.get(4)?,
                        habit_consistency: row.get(5)?,
                    })
                },
            )
            .optional()?;

        Ok(HealthSnapshot {
            date: date.to_string(),
            calories_today,
            calorie_target: 2200,
            protein_today,
            carbs_today,
            fat_today,
            has_pending_meals,
            metrics,
            habits: self.list_habits_for_date(date)?,
            books: self.list_books_with_progress(date)?,
            recent_workouts: self.list_workouts(None)?.into_iter().take(10).collect(),
            latest_weekly_report,
        })
    }

    pub fn get_storage_stats(&self) -> CoreResult<StorageStats> {
        compute_storage_stats(self.db_path.as_deref(), &self.media_dir)
    }

    pub fn seed_defaults_if_empty(&self) -> CoreResult<()> {
        let habit_count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM habits", [], |r| r.get(0))?;
        if habit_count == 0 {
            for name in ["Read 20 minutes", "Workout", "Drink 2L water", "Meditate"] {
                self.create_habit(name)?;
            }
        }
        Ok(())
    }

    pub fn seed_demo_data_if_empty(&self) -> CoreResult<bool> {
        self.seed_defaults_if_empty()?;

        let idea_count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM ideas WHERE deleted_at IS NULL", [], |r| r.get(0))?;
        let meal_count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM meals WHERE deleted_at IS NULL", [], |r| r.get(0))?;

        if idea_count > 0 || meal_count > 0 {
            return Ok(false);
        }

        let now = Utc::now();
        let today = local_date_from_utc(&now.to_rfc3339(), 330);
        let _yesterday = local_date_from_utc(&(now - chrono::Duration::days(1)).to_rfc3339(), 330);

        // 1. Seed habit logs for today (Read 20 min and Drink 2L water done)
        let habits = self.list_habits_for_date(&today)?;
        for h in habits {
            if (h.name == "Read 20 minutes" || h.name == "Drink 2L water") && !h.done {
                let _ = self.toggle_habit_check(&h.id, &today);
            }
        }

        // 2. Seed Ideas across Kanban columns (Raw, Incubating, Processed, Merged)
        let demo_ideas = [
            (
                "Habit reordering UX",
                "Allow drag-and-drop habit reordering with optimistic updates. Store sort_order in SQLite.",
                vec!["ux", "habits"],
                "raw",
            ),
            (
                "Dieter Rams principles",
                "Dieter Rams' principles on unobtrusive tools: good design is as little design as possible. The interface should disappear into the user's daily life.",
                vec!["design", "philosophy"],
                "incubating",
            ),
            (
                "Local-first sync architecture",
                "Move search and indexing to the device. Ship offline mode first before peer-to-peer Wi-Fi sync.",
                vec!["architecture", "sync"],
                "processed",
            ),
            (
                "Voice journal compression",
                "Opus audio at 24kbps produces crystal clear 60s recordings under 180KB.",
                vec!["audio", "optimization"],
                "merged",
            ),
        ];

        for (title, text, tags, status) in demo_ideas {
            let idea = self.create_idea(CreateIdeaInput {
                title: Some(title.into()),
                raw_text: text.into(),
                tags: tags.into_iter().map(String::from).collect(),
                tz_offset_minutes: 330,
            })?;
            if status != "raw" {
                self.set_idea_status(&idea.sync.id, status)?;
            }
        }

        // 3. Seed Meals (Today and Yesterday)
        let demo_meals = [
            // Today meals
            ("Oats with banana and chia seeds", 520, 18, 85, 10, "breakfast", 8),
            ("Chicken wrap and green salad", 680, 42, 60, 20, "lunch", 3),
            ("Salmon bowl with brown rice and steamed greens", 640, 44, 52, 22, "dinner", 0),
        ];
        for (desc, kcal, pro, carbs, fat, mtype, hours_ago) in demo_meals {
            let cap_time = (now - chrono::Duration::hours(hours_ago)).to_rfc3339();
            let id = Uuid::new_v4().to_string();
            self.conn.execute(
                "INSERT INTO meals (
                    id, created_at, updated_at, device_id, dirty, deleted_at, version,
                    captured_at, tz_offset_minutes, meal_type, photo_path, photo_sha256,
                    thumbnail_b64, user_note, manual_calories, food_items, total_kcal,
                    total_protein, total_carbs, total_fat, confidence, user_edited, status
                ) VALUES (
                    ?1, ?2, ?2, ?3, 1, NULL, 1,
                    ?2, 330, ?4, NULL, NULL,
                    NULL, ?5, ?6, '[]', ?6,
                    ?7, ?8, ?9, 0.95, 1, 'processed'
                )",
                params![
                    id,
                    cap_time,
                    self.device_id,
                    mtype,
                    desc,
                    kcal,
                    pro,
                    carbs,
                    fat,
                ],
            )?;
            self.sync_fts(&id, "meal", desc, &format!("{} kcal", kcal), mtype)?;
        }

        // Yesterday meals
        let yest_meals = [
            ("Dal, rice and vegetable sabzi", 720, 24, 110, 18, "lunch", 26),
            ("Paneer wrap with peppers", 610, 28, 55, 24, "dinner", 20),
        ];
        for (desc, kcal, pro, carbs, fat, mtype, hours_ago) in yest_meals {
            let cap_time = (now - chrono::Duration::hours(hours_ago)).to_rfc3339();
            let id = Uuid::new_v4().to_string();
            self.conn.execute(
                "INSERT INTO meals (
                    id, created_at, updated_at, device_id, dirty, deleted_at, version,
                    captured_at, tz_offset_minutes, meal_type, photo_path, photo_sha256,
                    thumbnail_b64, user_note, manual_calories, food_items, total_kcal,
                    total_protein, total_carbs, total_fat, confidence, user_edited, status
                ) VALUES (
                    ?1, ?2, ?2, ?3, 1, NULL, 1,
                    ?2, 330, ?4, NULL, NULL,
                    NULL, ?5, ?6, '[]', ?6,
                    ?7, ?8, ?9, 0.92, 1, 'processed'
                )",
                params![
                    id,
                    cap_time,
                    self.device_id,
                    mtype,
                    desc,
                    kcal,
                    pro,
                    carbs,
                    fat,
                ],
            )?;
            self.sync_fts(&id, "meal", desc, &format!("{} kcal", kcal), mtype)?;
        }

        // 4. Seed Voice Journal Entry
        let v_id = Uuid::new_v4().to_string();
        let v_time = (now - chrono::Duration::hours(2)).to_rfc3339();
        let bullets = serde_json::to_string(&vec![
            "Move search to the device",
            "Ship offline mode first",
            "Talk to two users this week",
        ])?;
        self.conn.execute(
            "INSERT INTO voice_journal_entries (
                id, created_at, updated_at, device_id, dirty, deleted_at, version,
                recorded_at, tz_offset_minutes, duration_seconds, audio_file_path,
                audio_sha256, transcript, edited_transcript, summary_bullets, status
            ) VALUES (
                ?1, ?2, ?2, ?3, 1, NULL, 1,
                ?2, 330, 48, NULL,
                NULL, ?4, ?4, ?5, 'processed'
            )",
            params![
                v_id,
                v_time,
                self.device_id,
                "Reflecting on the sync protocol. Moving search to the device was definitely the right choice. Let's make sure offline mode works flawlessly first, then talk to two users this week.",
                bullets,
            ],
        )?;
        self.sync_fts(&v_id, "voice", "Product roadmap thoughts for the sync feature", "Reflecting on the sync protocol. Moving search to the device was definitely the right choice.", "roadmap sync")?;

        // 5. Seed Reading (Atomic Habits)
        let b_id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO books (id, created_at, updated_at, device_id, dirty, deleted_at, version, title, total_pages, status)
             VALUES (?1, ?2, ?2, ?3, 1, NULL, 1, 'Atomic Habits', 320, 'reading')",
            params![b_id, now.to_rfc3339(), self.device_id],
        )?;
        self.log_reading(LogReadingInput {
            book_id: b_id,
            date: today.clone(),
            pages_read: 12,
            minutes_read: 25,
        })?;

        // 6. Seed Health Metrics
        let h_id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO health_daily_metrics (
                id, created_at, updated_at, device_id, dirty, deleted_at, version,
                date, steps, distance_meters, active_calories, sleep_minutes_total,
                sleep_stages_json, resting_heart_rate, average_heart_rate, source
            ) VALUES (
                ?1, ?2, ?2, ?3, 1, NULL, 1,
                ?4, 8420, 6200.0, 420, 435,
                NULL, 58, 68, 'health_connect'
            )",
            params![h_id, now.to_rfc3339(), self.device_id, today],
        )?;

        // 7. Seed Workout
        let w_id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO workouts (
                id, created_at, updated_at, device_id, dirty, deleted_at, version,
                timestamp, tz_offset_minutes, workout_type, duration_minutes, details_json,
                notes, source, duplicate_link_id
            ) VALUES (
                ?1, ?2, ?2, ?3, 1, NULL, 1,
                ?2, 330, 'mixed', 32, NULL,
                'Treadmill intervals: 3 sessions, avg 32m. Progressive overload achieved on dumbbell bench press (24kg x 8 reps).',
                'manual', NULL
            )",
            params![w_id, now.to_rfc3339(), self.device_id],
        )?;

        Ok(true)
    }
}

fn capitalize(s: &str) -> String {
    let mut c = s.chars();
    match c.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
    }
}

fn parse_sync_meta(row: &rusqlite::Row<'_>) -> rusqlite::Result<SyncMeta> {
    let dirty: i32 = row.get(4)?;
    Ok(SyncMeta {
        id: row.get(0)?,
        created_at: row.get(1)?,
        updated_at: row.get(2)?,
        device_id: row.get(3)?,
        dirty: dirty != 0,
        deleted_at: row.get(5)?,
        version: row.get(6)?,
    })
}

fn parse_idea_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Idea> {
    let sync = parse_sync_meta(row)?;
    let bullets_json: Option<String> = row.get(10)?;
    let tags_json: String = row.get(11)?;
    let status_str: String = row.get(12)?;

    let structured_bullets = bullets_json
        .and_then(|j| serde_json::from_str::<Vec<String>>(&j).ok());
    let tags = serde_json::from_str::<Vec<String>>(&tags_json).unwrap_or_default();

    Ok(Idea {
        sync,
        tz_offset_minutes: row.get(7)?,
        title: row.get(8)?,
        raw_text: row.get(9)?,
        structured_bullets,
        tags,
        status: IdeaStatus::from_str(&status_str),
    })
}

fn parse_meal_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Meal> {
    let sync = parse_sync_meta(row)?;
    let meal_type_str: String = row.get(9)?;
    let food_items_json: String = row.get(15)?;
    let user_edited: i32 = row.get(21)?;
    let status_str: String = row.get(22)?;

    let food_items = serde_json::from_str::<Vec<FoodItem>>(&food_items_json).unwrap_or_default();

    Ok(Meal {
        sync,
        captured_at: row.get(7)?,
        tz_offset_minutes: row.get(8)?,
        meal_type: MealType::from_str(&meal_type_str),
        photo_path: row.get(10)?,
        photo_sha256: row.get(11)?,
        thumbnail_b64: row.get(12)?,
        user_note: row.get(13)?,
        manual_calories: row.get(14)?,
        food_items,
        total_kcal: row.get(16)?,
        total_protein: row.get(17)?,
        total_carbs: row.get(18)?,
        total_fat: row.get(19)?,
        confidence: row.get(20)?,
        user_edited: user_edited != 0,
        status: ProcessingStatus::from_str(&status_str),
    })
}

fn parse_voice_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<VoiceJournalEntry> {
    let sync = parse_sync_meta(row)?;
    let bullets_json: Option<String> = row.get(14)?;
    let status_str: String = row.get(15)?;

    let summary_bullets = bullets_json
        .and_then(|j| serde_json::from_str::<Vec<String>>(&j).ok());

    Ok(VoiceJournalEntry {
        sync,
        recorded_at: row.get(7)?,
        tz_offset_minutes: row.get(8)?,
        duration_seconds: row.get(9)?,
        audio_file_path: row.get(10)?,
        audio_sha256: row.get(11)?,
        transcript: row.get(12)?,
        edited_transcript: row.get(13)?,
        summary_bullets,
        status: ProcessingStatus::from_str(&status_str),
    })
}

fn parse_habit_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Habit> {
    let sync = parse_sync_meta(row)?;
    let archived: i32 = row.get(10)?;
    Ok(Habit {
        sync,
        name: row.get(7)?,
        schedule: row.get(8)?,
        sort_order: row.get(9)?,
        archived: archived != 0,
    })
}

fn parse_book_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Book> {
    let sync = parse_sync_meta(row)?;
    Ok(Book {
        sync,
        title: row.get(7)?,
        total_pages: row.get(8)?,
        status: row.get(9)?,
    })
}

fn parse_workout_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Workout> {
    let sync = parse_sync_meta(row)?;
    let wt: String = row.get(9)?;
    let src: String = row.get(13)?;
    Ok(Workout {
        sync,
        timestamp: row.get(7)?,
        tz_offset_minutes: row.get(8)?,
        workout_type: WorkoutType::from_str(&wt),
        duration_minutes: row.get(10)?,
        details_json: row.get(11)?,
        notes: row.get(12)?,
        source: WorkoutSource::from_str(&src),
        duplicate_link_id: row.get(14)?,
    })
}

fn parse_health_metrics_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<HealthDailyMetrics> {
    let sync = parse_sync_meta(row)?;
    Ok(HealthDailyMetrics {
        sync,
        date: row.get(7)?,
        steps: row.get(8)?,
        distance_meters: row.get(9)?,
        active_calories: row.get(10)?,
        sleep_minutes_total: row.get(11)?,
        sleep_stages_json: row.get(12)?,
        resting_heart_rate: row.get(13)?,
        average_heart_rate: row.get(14)?,
        source: row.get(15)?,
    })
}
