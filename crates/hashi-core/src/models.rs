use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SyncMeta {
    pub id: String,
    pub created_at: String,
    pub updated_at: String,
    pub device_id: String,
    pub dirty: bool,
    pub deleted_at: Option<String>,
    pub version: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum IdeaStatus {
    Raw,
    Processed,
    Merged,
    PendingMerge,
}

impl IdeaStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            IdeaStatus::Raw => "raw",
            IdeaStatus::Processed => "processed",
            IdeaStatus::Merged => "merged",
            IdeaStatus::PendingMerge => "pending_merge",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "processed" => IdeaStatus::Processed,
            "merged" => IdeaStatus::Merged,
            "pending_merge" => IdeaStatus::PendingMerge,
            _ => IdeaStatus::Raw,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Idea {
    #[serde(flatten)]
    pub sync: SyncMeta,
    pub tz_offset_minutes: i32,
    pub title: Option<String>,
    pub raw_text: String,
    pub structured_bullets: Option<Vec<String>>,
    pub tags: Vec<String>,
    pub status: IdeaStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RevisionType {
    Base,
    Phone,
    Pc,
    Merged,
    Edit,
}

impl RevisionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            RevisionType::Base => "base",
            RevisionType::Phone => "phone",
            RevisionType::Pc => "pc",
            RevisionType::Merged => "merged",
            RevisionType::Edit => "edit",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "base" => RevisionType::Base,
            "phone" => RevisionType::Phone,
            "pc" => RevisionType::Pc,
            "merged" => RevisionType::Merged,
            _ => RevisionType::Edit,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdeaRevision {
    pub id: String,
    pub idea_id: String,
    pub rev_type: RevisionType,
    pub content: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProcessingStatus {
    Pending,
    Processing,
    Done,
    Failed,
}

impl ProcessingStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            ProcessingStatus::Pending => "pending",
            ProcessingStatus::Processing => "processing",
            ProcessingStatus::Done => "done",
            ProcessingStatus::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "processing" => ProcessingStatus::Processing,
            "done" => ProcessingStatus::Done,
            "failed" => ProcessingStatus::Failed,
            _ => ProcessingStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceJournalEntry {
    #[serde(flatten)]
    pub sync: SyncMeta,
    pub recorded_at: String,
    pub tz_offset_minutes: i32,
    pub duration_seconds: u32,
    pub audio_file_path: Option<String>,
    pub audio_sha256: Option<String>,
    pub transcript: Option<String>,
    pub edited_transcript: Option<String>,
    pub summary_bullets: Option<Vec<String>>,
    pub status: ProcessingStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MealType {
    Breakfast,
    Lunch,
    Dinner,
    Snack,
}

impl MealType {
    pub fn as_str(&self) -> &'static str {
        match self {
            MealType::Breakfast => "breakfast",
            MealType::Lunch => "lunch",
            MealType::Dinner => "dinner",
            MealType::Snack => "snack",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "breakfast" => MealType::Breakfast,
            "lunch" => MealType::Lunch,
            "dinner" => MealType::Dinner,
            _ => MealType::Snack,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FoodItem {
    pub name: String,
    pub estimated_quantity: String,
    pub kcal: u32,
    pub protein: f32,
    pub carbs: f32,
    pub fat: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Meal {
    #[serde(flatten)]
    pub sync: SyncMeta,
    pub captured_at: String,
    pub tz_offset_minutes: i32,
    pub meal_type: MealType,
    pub photo_path: Option<String>,
    pub photo_sha256: Option<String>,
    pub thumbnail_b64: Option<String>,
    pub user_note: Option<String>,
    pub manual_calories: Option<u32>,
    pub food_items: Vec<FoodItem>,
    pub total_kcal: u32,
    pub total_protein: f32,
    pub total_carbs: f32,
    pub total_fat: f32,
    pub confidence: Option<f32>,
    pub user_edited: bool,
    pub status: ProcessingStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WorkoutType {
    Treadmill,
    Strength,
    Mobility,
    Custom,
}

impl WorkoutType {
    pub fn as_str(&self) -> &'static str {
        match self {
            WorkoutType::Treadmill => "treadmill",
            WorkoutType::Strength => "strength",
            WorkoutType::Mobility => "mobility",
            WorkoutType::Custom => "custom",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "treadmill" => WorkoutType::Treadmill,
            "strength" => WorkoutType::Strength,
            "mobility" => WorkoutType::Mobility,
            _ => WorkoutType::Custom,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WorkoutSource {
    Manual,
    HealthConnect,
}

impl WorkoutSource {
    pub fn as_str(&self) -> &'static str {
        match self {
            WorkoutSource::Manual => "manual",
            WorkoutSource::HealthConnect => "health_connect",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "health_connect" => WorkoutSource::HealthConnect,
            _ => WorkoutSource::Manual,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workout {
    #[serde(flatten)]
    pub sync: SyncMeta,
    pub timestamp: String,
    pub tz_offset_minutes: i32,
    pub workout_type: WorkoutType,
    pub duration_minutes: u32,
    pub details_json: Option<String>,
    pub notes: Option<String>,
    pub source: WorkoutSource,
    pub duplicate_link_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthDailyMetrics {
    #[serde(flatten)]
    pub sync: SyncMeta,
    pub date: String,
    pub steps: u32,
    pub distance_meters: f32,
    pub active_calories: u32,
    pub sleep_minutes_total: u32,
    pub sleep_stages_json: Option<String>,
    pub resting_heart_rate: Option<u32>,
    pub average_heart_rate: Option<u32>,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Habit {
    #[serde(flatten)]
    pub sync: SyncMeta,
    pub name: String,
    pub schedule: String,
    pub sort_order: i32,
    pub archived: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HabitCheck {
    #[serde(flatten)]
    pub sync: SyncMeta,
    pub habit_id: String,
    pub date: String,
    pub done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HabitWithStatus {
    pub id: String,
    pub name: String,
    pub schedule: String,
    pub sort_order: i32,
    pub archived: bool,
    pub done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Book {
    #[serde(flatten)]
    pub sync: SyncMeta,
    pub title: String,
    pub total_pages: Option<u32>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadingLog {
    #[serde(flatten)]
    pub sync: SyncMeta,
    pub book_id: String,
    pub date: String,
    pub pages_read: u32,
    pub minutes_read: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookProgress {
    pub id: String,
    pub title: String,
    pub total_pages: Option<u32>,
    pub status: String,
    pub pages_read_total: u32,
    pub minutes_today: u32,
    pub pages_today: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailySummary {
    pub date: String,
    pub total_calories: u32,
    pub total_protein: f32,
    pub total_carbs: f32,
    pub total_fat: f32,
    pub recap_text: Option<String>,
    pub entry_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeeklyReport {
    pub week_start_date: String,
    pub exercise_analysis: String,
    pub volume_totals: String,
    pub consistency_score: f32,
    pub reading_consistency: f32,
    pub habit_consistency: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub daily_calorie_target: u32,
    pub daily_protein_target: u32,
    pub daily_carbs_target: u32,
    pub daily_fat_target: u32,
    pub batch_time: String,
    pub vault_directory: String,
    pub theme: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentItem {
    pub id: String,
    pub kind: String, // "meal" | "voice" | "note"
    pub title: String,
    pub detail: String,
    pub timestamp: String,
    pub tz_offset_minutes: i32,
    pub status: String, // "pending" | "done" | "raw" | "processed" | "merged"
    pub kcal: Option<u32>,
    pub duration_seconds: Option<u32>,
    pub summary_bullets: Option<Vec<String>>,
    pub thumbnail_b64: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomeSnapshot {
    pub recent: Vec<RecentItem>,
    pub calories_today: u32,
    pub has_pending_meals: bool,
    pub steps_today: Option<u32>,
    pub reading_streak_days: u32,
    pub habit_streak_days: u32,
    pub pending_sync_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthSnapshot {
    pub date: String,
    pub calories_today: u32,
    pub calorie_target: u32,
    pub protein_today: f32,
    pub carbs_today: f32,
    pub fat_today: f32,
    pub has_pending_meals: bool,
    pub metrics: Option<HealthDailyMetrics>,
    pub habits: Vec<HabitWithStatus>,
    pub books: Vec<BookProgress>,
    pub recent_workouts: Vec<Workout>,
    pub latest_weekly_report: Option<WeeklyReport>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHit {
    pub record_id: String,
    pub record_type: String,
    pub title: String,
    pub snippet: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageStats {
    pub db_bytes: u64,
    pub media_bytes: u64,
    pub meal_photo_count: u32,
    pub audio_file_count: u32,
}
