#[derive(Debug, Clone)]
pub struct SyncMeta {
    pub id: String,
    pub created_at: String,
    pub updated_at: String,
    pub device_id: String,
    pub dirty: bool,
    pub deleted_at: Option<String>,
    pub version: u64,
}

#[derive(Debug, Clone)]
pub enum IdeaStatus {
    Raw,
    Processed,
    Merged,
    PendingMerge,
}

#[derive(Debug, Clone)]
pub struct Idea {
    pub sync: SyncMeta,
    pub title: Option<String>,
    pub raw_text: String,
    pub structured_bullets: Option<Vec<String>>,
    pub tags: Vec<String>,
    pub status: IdeaStatus,
}

#[derive(Debug, Clone)]
pub enum RevisionType {
    Base,
    Phone,
    Pc,
    Merged,
    Edit,
}

#[derive(Debug, Clone)]
pub struct IdeaRevision {
    pub id: String,
    pub idea_id: String,
    pub rev_type: RevisionType,
    pub content: String,
    pub timestamp: String,
}

#[derive(Debug, Clone)]
pub enum ProcessingStatus {
    Pending,
    Processing,
    Done,
    Failed,
}

#[derive(Debug, Clone)]
pub struct VoiceJournalEntry {
    pub sync: SyncMeta,
    pub recorded_at: String,
    pub duration_seconds: u32,
    pub audio_file_path: Option<String>,
    pub audio_sha256: Option<String>,
    pub transcript: Option<String>,
    pub edited_transcript: Option<String>,
    pub summary_bullets: Option<Vec<String>>,
    pub status: ProcessingStatus,
}

#[derive(Debug, Clone)]
pub enum MealType {
    Breakfast,
    Lunch,
    Dinner,
    Snack,
}

#[derive(Debug, Clone)]
pub struct FoodItem {
    pub name: String,
    pub estimated_quantity: String,
    pub kcal: u32,
    pub protein: f32,
    pub carbs: f32,
    pub fat: f32,
}

#[derive(Debug, Clone)]
pub struct Meal {
    pub sync: SyncMeta,
    pub captured_at: String,
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

#[derive(Debug, Clone)]
pub enum WorkoutType {
    Treadmill,
    Strength,
    Mobility,
    Custom,
}

#[derive(Debug, Clone)]
pub enum WorkoutSource {
    Manual,
    HealthConnect,
}

#[derive(Debug, Clone)]
pub struct Workout {
    pub sync: SyncMeta,
    pub timestamp: String,
    pub workout_type: WorkoutType,
    pub duration_minutes: u32,
    pub notes: Option<String>,
    pub source: WorkoutSource,
    pub duplicate_link_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct HealthDailyMetrics {
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

#[derive(Debug, Clone)]
pub struct Habit {
    pub sync: SyncMeta,
    pub name: String,
    pub schedule: String,
    pub archived: bool,
}

#[derive(Debug, Clone)]
pub struct HabitCheck {
    pub sync: SyncMeta,
    pub habit_id: String,
    pub date: String,
    pub done: bool,
}

#[derive(Debug, Clone)]
pub struct Book {
    pub sync: SyncMeta,
    pub title: String,
    pub total_pages: Option<u32>,
    pub status: String,
}

#[derive(Debug, Clone)]
pub struct ReadingLog {
    pub sync: SyncMeta,
    pub book_id: String,
    pub date: String,
    pub pages_read: u32,
    pub minutes_read: u32,
}

#[derive(Debug, Clone)]
pub struct PrivateLogEntry {
    pub id: String,
    pub timestamp: String,
    pub trigger_tag: String,
    pub place: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone)]
pub struct DailySummary {
    pub date: String,
    pub total_calories: u32,
    pub total_protein: f32,
    pub total_carbs: f32,
    pub total_fat: f32,
    pub recap_text: Option<String>,
    pub entry_count: u32,
}

#[derive(Debug, Clone)]
pub struct WeeklyReport {
    pub week_start_date: String,
    pub exercise_analysis: String,
    pub volume_totals: String,
    pub consistency_score: f32,
    pub reading_consistency: f32,
    pub habit_consistency: f32,
}

#[derive(Debug, Clone)]
pub struct AppSettings {
    pub daily_calorie_target: u32,
    pub daily_protein_target: u32,
    pub daily_carbs_target: u32,
    pub daily_fat_target: u32,
    pub batch_time: String,
    pub vault_directory: String,
    pub theme: String,
}
