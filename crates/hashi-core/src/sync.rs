use crate::models::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairingBundle {
    pub device_id: String,
    pub role: String, // "pc" or "phone"
    pub secret: String,
    pub port: u16,
    pub host_ips: Vec<String>,
    pub created_at: String,
}

impl PairingBundle {
    pub fn to_qr_string(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    pub fn from_qr_string(s: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(s)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairingHandshakeRequest {
    pub device_id: String,
    pub role: String,
    pub secret: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairingStatus {
    pub is_paired: bool,
    pub peer_device_id: Option<String>,
    pub peer_address: Option<String>,
    pub role: Option<String>,
    pub paired_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaUploadItem {
    pub record_id: String,
    pub media_type: String, // "meals" or "audio"
    pub file_path: String,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncBatch {
    pub device_id: String,
    pub sent_at: String,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncAck {
    pub confirmed_until: String,
    pub acknowledged_ids: Vec<String>,
    pub conflicts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncApplyResult {
    pub applied_count: usize,
    pub conflicts: Vec<String>,
    pub ack: SyncAck,
}

pub fn detect_conflict(base: &Idea, phone: &Idea, pc: &Idea) -> bool {
    let phone_changed = phone.raw_text != base.raw_text;
    let pc_changed = pc.raw_text != base.raw_text;
    phone_changed && pc_changed
}
