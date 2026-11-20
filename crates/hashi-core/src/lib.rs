pub mod crypto;
pub mod db;
pub mod error;
pub mod media;
pub mod models;
pub mod repo;
pub mod schema;
pub mod sync;

pub use db::Database;
pub use error::{CoreError, CoreResult};
pub use models::*;
pub use repo::*;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::media::verify_file_checksum;
    use crate::schema::{Migration, MIGRATIONS};
    use std::fs;
    use std::path::PathBuf;
    use uuid::Uuid;

    fn temp_dir(label: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("hashi_test_{}_{}", label, Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn migrations_and_pre_migration_backup() {
        let dir = temp_dir("migrations");
        let db_path = dir.join("hashi.db");
        let media_dir = dir.join("media");

        let mut db = Database::open(&db_path, &media_dir, "phone-test-1").unwrap();
        assert_eq!(db.schema_version().unwrap(), 1);

        // Apply a v2 migration and verify a pre-migration backup file is created
        let v2_migrations = [
            MIGRATIONS[0].sql,
            "ALTER TABLE books ADD COLUMN author TEXT;",
        ];
        let custom = [
            Migration {
                version: 1,
                name: "initial_core_schema",
                sql: v2_migrations[0],
            },
            Migration {
                version: 2,
                name: "add_book_author_test",
                sql: v2_migrations[1],
            },
        ];

        let backup = db.run_migrations(&custom, true).unwrap();
        assert!(backup.is_some(), "Expected automatic pre-migration backup");
        let backup_path = backup.unwrap();
        assert!(backup_path.exists());
        assert_eq!(db.schema_version().unwrap(), 2);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn full_mobile_capture_persist_and_reload() {
        let dir = temp_dir("persist_reload");
        let db_path = dir.join("hashi.db");
        let media_dir = dir.join("media");
        let today = "2026-11-18";

        let idea_id;
        let meal_id;
        let voice_id;
        let habit_id;
        let book_id;
        let photo_rel;
        let photo_sha;
        let audio_rel;
        let audio_sha;

        // First session: create all capture types
        {
            let db = Database::open(&db_path, &media_dir, "phone-pixel").unwrap();

            // 1. Idea + Edit + Revisions
            let idea = db
                .create_idea(CreateIdeaInput {
                    title: Some("Offline sync notes".into()),
                    raw_text: "Keep captures instant and queue everything locally.".into(),
                    tags: vec!["dev".into(), "general".into()],
                    tz_offset_minutes: 330,
                })
                .unwrap();
            idea_id = idea.sync.id.clone();

            let updated = db
                .update_idea(UpdateIdeaInput {
                    id: idea_id.clone(),
                    title: Some("Offline sync architecture".into()),
                    raw_text: "Keep captures instant, write SQLite WAL, sync on hotspot.".into(),
                    tags: vec!["dev".into()],
                    status: None,
                })
                .unwrap();
            assert_eq!(updated.sync.version, 2);
            assert_eq!(db.list_idea_revisions(&idea_id).unwrap().len(), 2);

            // 2. Meal with private photo bytes + SHA-256 + thumbnail
            let meal = db
                .create_meal(CreateMealInput {
                    meal_type: "lunch".into(),
                    user_note: Some("200g paneer, 2 rotis".into()),
                    manual_calories: Some(650),
                    photo_bytes: Some(b"fake-jpeg-bytes-for-test".to_vec()),
                    photo_ext: Some("jpg".into()),
                    thumbnail_b64: Some("data:image/jpeg;base64,AAAA".into()),
                    tz_offset_minutes: 330,
                })
                .unwrap();
            meal_id = meal.sync.id.clone();
            photo_rel = meal.photo_path.clone().unwrap();
            photo_sha = meal.photo_sha256.clone().unwrap();
            assert!(verify_file_checksum(&media_dir.join(&photo_rel), &photo_sha).unwrap());

            // 3. Voice journal with 45s duration + audio bytes + SHA-256
            let voice = db
                .create_voice_journal(CreateVoiceInput {
                    duration_seconds: 45,
                    audio_bytes: Some(b"OggS-fake-opus-audio-stream".to_vec()),
                    audio_ext: Some("opus".into()),
                    tz_offset_minutes: 330,
                })
                .unwrap();
            voice_id = voice.sync.id.clone();
            audio_rel = voice.audio_file_path.clone().unwrap();
            audio_sha = voice.audio_sha256.clone().unwrap();
            assert!(verify_file_checksum(&media_dir.join(&audio_rel), &audio_sha).unwrap());

            // Duration > 60 must be rejected
            assert!(db
                .create_voice_journal(CreateVoiceInput {
                    duration_seconds: 61,
                    audio_bytes: None,
                    audio_ext: None,
                    tz_offset_minutes: 330,
                })
                .is_err());

            // 4. Habits
            let habit = db.create_habit("Read 20 minutes").unwrap();
            habit_id = habit.sync.id.clone();
            assert!(db.toggle_habit_check(&habit_id, today).unwrap());

            // 5. Book & Reading log
            let book = db.create_book("Deep Work", Some(304)).unwrap();
            book_id = book.sync.id.clone();
            db.log_reading(LogReadingInput {
                book_id: book_id.clone(),
                date: today.into(),
                pages_read: 25,
                minutes_read: 30,
            })
            .unwrap();

            // 6. Workout
            db.create_workout(CreateWorkoutInput {
                workout_type: "treadmill".into(),
                duration_minutes: 35,
                details_json: Some(r#"{"incline":3.0,"speed":8.5}"#.into()),
                notes: Some("Steady incline walk".into()),
                tz_offset_minutes: 330,
            })
            .unwrap();
        }

        // Second session: reopen from disk and verify everything persisted
        {
            let db = Database::open(&db_path, &media_dir, "phone-pixel").unwrap();

            let loaded_idea = db.get_idea(&idea_id).unwrap().unwrap();
            assert_eq!(loaded_idea.title.as_deref(), Some("Offline sync architecture"));
            assert_eq!(loaded_idea.sync.version, 2);

            let loaded_meal = db.get_meal(&meal_id).unwrap().unwrap();
            assert_eq!(loaded_meal.manual_calories, Some(650));
            assert_eq!(loaded_meal.photo_sha256.as_deref(), Some(photo_sha.as_str()));
            assert!(media_dir.join(&photo_rel).exists());

            let loaded_voice = db.get_voice_journal(&voice_id).unwrap().unwrap();
            assert_eq!(loaded_voice.duration_seconds, 45);
            assert_eq!(loaded_voice.audio_sha256.as_deref(), Some(audio_sha.as_str()));
            assert!(media_dir.join(&audio_rel).exists());

            let habits = db.list_habits_for_date(today).unwrap();
            assert_eq!(habits.len(), 1);
            assert!(habits[0].done);
            assert_eq!(db.habit_streak_days(today).unwrap(), 1);

            let books = db.list_books_with_progress(today).unwrap();
            assert_eq!(books.len(), 1);
            assert_eq!(books[0].pages_read_total, 25);
            assert_eq!(books[0].minutes_today, 30);
            assert_eq!(db.reading_streak_days(today).unwrap(), 1);

            let workouts = db.list_workouts(None).unwrap();
            assert_eq!(workouts.len(), 1);
            assert_eq!(workouts[0].workout_type, WorkoutType::Treadmill);

            // FTS5 search works on ideas and meals
            let hits = db.search_fts("paneer").unwrap();
            assert_eq!(hits.len(), 1);
            assert_eq!(hits[0].record_id, meal_id);

            let idea_hits = db.search_fts("hotspot").unwrap();
            assert_eq!(idea_hits.len(), 1);
            assert_eq!(idea_hits[0].record_id, idea_id);

            // Storage stats reflect saved files
            let stats = db.get_storage_stats().unwrap();
            assert_eq!(stats.meal_photo_count, 1);
            assert_eq!(stats.audio_file_count, 1);
            assert!(stats.media_bytes > 0);
            assert!(stats.db_bytes > 0);

            // Home snapshot
            let home = db.get_home_snapshot(today).unwrap();
            assert_eq!(home.recent.len(), 3);
            assert!(home.pending_sync_count >= 6);

            // Soft-delete tombstone removes idea from listings and FTS5
            db.delete_idea(&idea_id).unwrap();
            assert!(db.get_idea(&idea_id).unwrap().is_none());
            assert!(db.search_fts("hotspot").unwrap().is_empty());
        }

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn habit_reorder_rename_archive_and_conflict_detection() {
        let dir = temp_dir("habits_conflict");
        let db = Database::open_in_memory(&dir, "phone-test").unwrap();
        let today = "2026-11-18";

        let h1 = db.create_habit("Walk").unwrap();
        let h2 = db.create_habit("Stretch").unwrap();
        db.rename_habit(&h1.sync.id, "Morning walk").unwrap();
        db.reorder_habits(&[h2.sync.id.clone(), h1.sync.id.clone()]).unwrap();

        let list = db.list_habits_for_date(today).unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].name, "Stretch");
        assert_eq!(list[1].name, "Morning walk");

        db.archive_habit(&h2.sync.id, true).unwrap();
        let after_archive = db.list_habits_for_date(today).unwrap();
        assert_eq!(after_archive.len(), 1);
        assert_eq!(after_archive[0].name, "Morning walk");

        // Conflict detection unit check
        let base = db
            .create_idea(CreateIdeaInput {
                title: None,
                raw_text: "base draft".into(),
                tags: vec![],
                tz_offset_minutes: 330,
            })
            .unwrap();
        let mut phone_edit = base.clone();
        phone_edit.raw_text = "phone edit".into();
        let mut pc_edit = base.clone();
        pc_edit.raw_text = "pc edit".into();
        assert!(sync::detect_conflict(&base, &phone_edit, &pc_edit));
        assert!(!sync::detect_conflict(&base, &phone_edit, &base));

        let _ = fs::remove_dir_all(&dir);
    }
}
