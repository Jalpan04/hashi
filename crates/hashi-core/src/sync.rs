use crate::models::*;

#[derive(Debug, Clone)]
pub struct SyncBatch {
    pub device_id: String,
    pub ideas: Vec<Idea>,
    pub voice_entries: Vec<VoiceJournalEntry>,
    pub meals: Vec<Meal>,
    pub workouts: Vec<Workout>,
    pub health_metrics: Vec<HealthDailyMetrics>,
    pub habits: Vec<Habit>,
    pub habit_checks: Vec<HabitCheck>,
    pub books: Vec<Book>,
    pub reading_logs: Vec<ReadingLog>,
}

#[derive(Debug, Clone)]
pub struct SyncAck {
    pub confirmed_until: String,
    pub acknowledged_ids: Vec<String>,
}

pub fn detect_conflict(base: &Idea, phone: &Idea, pc: &Idea) -> bool {
    let phone_changed = phone.raw_text != base.raw_text;
    let pc_changed = pc.raw_text != base.raw_text;
    phone_changed && pc_changed
}
