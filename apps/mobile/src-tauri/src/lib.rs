use base64::Engine;
use hashi_core::{
    Book, BookProgress, CreateIdeaInput, CreateMealInput, CreateVoiceInput, CreateWorkoutInput,
    Database, Habit, HabitWithStatus, HealthSnapshot, HomeSnapshot, Idea, IdeaRevision,
    LogReadingInput, Meal, ReadingLog, StorageStats, UpdateIdeaInput, VoiceJournalEntry, Workout,
};
use serde::Deserialize;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};

pub struct AppState {
    pub db: Mutex<Database>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMealPayload {
    pub meal_type: String,
    pub user_note: Option<String>,
    pub manual_calories: Option<u32>,
    pub photo_b64: Option<String>,
    pub photo_ext: Option<String>,
    pub thumbnail_b64: Option<String>,
    pub tz_offset_minutes: i32,
}

#[derive(Debug, Deserialize)]
pub struct CreateVoicePayload {
    pub duration_seconds: u32,
    pub audio_b64: Option<String>,
    pub audio_ext: Option<String>,
    pub tz_offset_minutes: i32,
}

fn decode_optional_b64(input: Option<String>) -> Result<Option<Vec<u8>>, String> {
    match input {
        None => Ok(None),
        Some(raw) => {
            let trimmed = raw.trim();
            if trimmed.is_empty() {
                return Ok(None);
            }
            // Strip optional data URI prefix (e.g. "data:image/jpeg;base64,...")
            let payload = match trimmed.find(",") {
                Some(idx) if trimmed.starts_with("data:") => &trimmed[idx + 1..],
                _ => trimmed,
            };
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(payload)
                .map_err(|e| format!("Invalid base64 payload: {}", e))?;
            Ok(Some(bytes))
        }
    }
}

fn load_or_create_device_id(app_dir: &PathBuf) -> String {
    let id_file = app_dir.join("device_id.txt");
    if let Ok(existing) = fs::read_to_string(&id_file) {
        let trimmed = existing.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    let new_id = format!("mobile-{}", chrono::Utc::now().timestamp_millis());
    let _ = fs::write(&id_file, &new_id);
    new_id
}

#[tauri::command]
fn get_home_snapshot(state: State<'_, AppState>, date: String) -> Result<HomeSnapshot, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_home_snapshot(&date).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_health_snapshot(state: State<'_, AppState>, date: String) -> Result<HealthSnapshot, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_health_snapshot(&date).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_idea(state: State<'_, AppState>, payload: CreateIdeaInput) -> Result<Idea, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_idea(payload).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_ideas(
    state: State<'_, AppState>,
    search: Option<String>,
    tag: Option<String>,
    status: Option<String>,
) -> Result<Vec<Idea>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_ideas(search.as_deref(), tag.as_deref(), status.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_idea(state: State<'_, AppState>, payload: UpdateIdeaInput) -> Result<Idea, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_idea(payload).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_idea(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_idea(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_idea_revisions(
    state: State<'_, AppState>,
    idea_id: String,
) -> Result<Vec<IdeaRevision>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_idea_revisions(&idea_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_meal(state: State<'_, AppState>, payload: CreateMealPayload) -> Result<Meal, String> {
    let photo_bytes = decode_optional_b64(payload.photo_b64)?;
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_meal(CreateMealInput {
        meal_type: payload.meal_type,
        user_note: payload.user_note,
        manual_calories: payload.manual_calories,
        photo_bytes,
        photo_ext: payload.photo_ext,
        thumbnail_b64: payload.thumbnail_b64,
        tz_offset_minutes: payload.tz_offset_minutes,
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_meals(state: State<'_, AppState>, date: Option<String>) -> Result<Vec<Meal>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_meals(date.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_meal(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_meal(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_voice_journal(
    state: State<'_, AppState>,
    payload: CreateVoicePayload,
) -> Result<VoiceJournalEntry, String> {
    let audio_bytes = decode_optional_b64(payload.audio_b64)?;
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_voice_journal(CreateVoiceInput {
        duration_seconds: payload.duration_seconds,
        audio_bytes,
        audio_ext: payload.audio_ext,
        tz_offset_minutes: payload.tz_offset_minutes,
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_voice_journals(
    state: State<'_, AppState>,
    date: Option<String>,
) -> Result<Vec<VoiceJournalEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_voice_journals(date.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_voice_journal(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_voice_journal(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_habits(state: State<'_, AppState>, date: String) -> Result<Vec<HabitWithStatus>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_habits_for_date(&date).map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_habit(
    state: State<'_, AppState>,
    habit_id: String,
    date: String,
) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.toggle_habit_check(&habit_id, &date)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_habit(state: State<'_, AppState>, name: String) -> Result<Habit, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_habit(&name).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_habit(state: State<'_, AppState>, id: String, name: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.rename_habit(&id, &name).map_err(|e| e.to_string())
}

#[tauri::command]
fn reorder_habits(state: State<'_, AppState>, ordered_ids: Vec<String>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.reorder_habits(&ordered_ids).map_err(|e| e.to_string())
}

#[tauri::command]
fn archive_habit(state: State<'_, AppState>, id: String, archived: bool) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.archive_habit(&id, archived).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_books(state: State<'_, AppState>, date: String) -> Result<Vec<BookProgress>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_books_with_progress(&date)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_book(
    state: State<'_, AppState>,
    title: String,
    total_pages: Option<u32>,
) -> Result<Book, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_book(&title, total_pages)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn log_reading(state: State<'_, AppState>, payload: LogReadingInput) -> Result<ReadingLog, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.log_reading(payload).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_workout(
    state: State<'_, AppState>,
    payload: CreateWorkoutInput,
) -> Result<Workout, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_workout(payload).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_workouts(
    state: State<'_, AppState>,
    date: Option<String>,
) -> Result<Vec<Workout>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_workouts(date.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_storage_stats(state: State<'_, AppState>) -> Result<StorageStats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_storage_stats().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            fs::create_dir_all(&app_dir)?;

            let db_path = app_dir.join("hashi_mobile.db");
            let media_dir = app_dir.join("media");
            let device_id = load_or_create_device_id(&app_dir);

            let db = Database::open(&db_path, &media_dir, device_id)
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            let _ = db.seed_defaults_if_empty();

            app.manage(AppState { db: Mutex::new(db) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_home_snapshot,
            get_health_snapshot,
            create_idea,
            list_ideas,
            update_idea,
            delete_idea,
            list_idea_revisions,
            create_meal,
            list_meals,
            delete_meal,
            create_voice_journal,
            list_voice_journals,
            delete_voice_journal,
            list_habits,
            toggle_habit,
            create_habit,
            rename_habit,
            reorder_habits,
            archive_habit,
            list_books,
            create_book,
            log_reading,
            create_workout,
            list_workouts,
            get_storage_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hashi mobile application");
}
