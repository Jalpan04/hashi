#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use hashi_core::{
    Book, BookProgress, CreateIdeaInput, CreateManualMealInput, CreateWorkoutInput,
    Database, HabitWithStatus, HealthSnapshot, HomeSnapshot, Idea, IdeaRevision,
    LogReadingInput, Meal, PairingBundle, PairingStatus, ReadingLog, SearchHit,
    StorageStats, UpdateIdeaInput, VoiceJournalEntry, Workout,
};
use hashi_server::{DiscoveryServer, LanServer, SyncSummary};
use serde::Deserialize;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
    pub lan_server: Mutex<Option<LanServer>>,
    pub discovery_server: Mutex<Option<DiscoveryServer>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDesktopMealPayload {
    pub meal_type: String,
    pub user_note: String,
    pub calories: u32,
    pub protein: Option<u32>,
    pub carbs: Option<u32>,
    pub fat: Option<u32>,
    pub thumbnail_b64: Option<String>,
    pub tz_offset_minutes: Option<i32>,
}

fn today_str() -> String {
    chrono::Utc::now()
        .with_timezone(&chrono::FixedOffset::east_opt(330 * 60).unwrap())
        .format("%Y-%m-%d")
        .to_string()
}

fn resolve_desktop_db_dir<R: tauri::Runtime>(app: &tauri::App<R>) -> PathBuf {
    if let Ok(app_data) = app.path().app_data_dir() {
        if fs::create_dir_all(&app_data).is_ok() {
            return app_data;
        }
    }
    let local_dev = PathBuf::from("dev-data");
    let _ = fs::create_dir_all(&local_dev);
    local_dev
}

fn load_or_create_device_id(dir: &PathBuf) -> String {
    let id_file = dir.join("device_id.txt");
    if let Ok(existing) = fs::read_to_string(&id_file) {
        let trimmed = existing.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    let new_id = format!("desktop-{}", chrono::Utc::now().timestamp_millis());
    let _ = fs::write(&id_file, &new_id);
    new_id
}

#[tauri::command]
fn get_home_snapshot(
    state: State<'_, AppState>,
    date: Option<String>,
) -> Result<HomeSnapshot, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let d = date.unwrap_or_else(today_str);
    db.get_home_snapshot(&d).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_health_snapshot(
    state: State<'_, AppState>,
    date: Option<String>,
) -> Result<HealthSnapshot, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let d = date.unwrap_or_else(today_str);
    db.get_health_snapshot(&d).map_err(|e| e.to_string())
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
fn create_idea(
    state: State<'_, AppState>,
    title: Option<String>,
    raw_text: String,
    tags: Vec<String>,
    tz_offset_minutes: Option<i32>,
) -> Result<Idea, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_idea(CreateIdeaInput {
        title,
        raw_text,
        tags,
        tz_offset_minutes: tz_offset_minutes.unwrap_or(330),
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_idea(
    state: State<'_, AppState>,
    id: String,
    title: Option<String>,
    raw_text: String,
    tags: Vec<String>,
    status: Option<String>,
) -> Result<Idea, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_idea(UpdateIdeaInput {
        id,
        title,
        raw_text,
        tags,
        status,
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_idea_status(
    state: State<'_, AppState>,
    id: String,
    status: String,
) -> Result<Idea, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.set_idea_status(&id, &status).map_err(|e| e.to_string())
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
fn list_meals(state: State<'_, AppState>, date: Option<String>) -> Result<Vec<Meal>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_meals(date.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_meal(
    state: State<'_, AppState>,
    payload: CreateDesktopMealPayload,
) -> Result<Meal, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let cal = payload.calories;
    let pro = payload.protein.unwrap_or_else(|| (cal as f32 * 0.05).round() as u32);
    let carbs = payload.carbs.unwrap_or_else(|| (cal as f32 * 0.10).round() as u32);
    let fat = payload.fat.unwrap_or_else(|| (cal as f32 * 0.03).round() as u32);

    db.create_manual_meal(CreateManualMealInput {
        meal_type: payload.meal_type,
        user_note: payload.user_note,
        calories: cal,
        protein: pro,
        carbs,
        fat,
        thumbnail_b64: payload.thumbnail_b64,
        tz_offset_minutes: payload.tz_offset_minutes.unwrap_or(330),
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_meal(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_meal(&id).map_err(|e| e.to_string())
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
fn list_habits(
    state: State<'_, AppState>,
    date: Option<String>,
) -> Result<Vec<HabitWithStatus>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let d = date.unwrap_or_else(today_str);
    db.list_habits_for_date(&d).map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_habit(
    state: State<'_, AppState>,
    habit_id: String,
    date: Option<String>,
) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let d = date.unwrap_or_else(today_str);
    db.toggle_habit_check(&habit_id, &d)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_habit(state: State<'_, AppState>, name: String) -> Result<hashi_core::Habit, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_habit(&name).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_habit(
    state: State<'_, AppState>,
    habit_id: String,
    name: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.rename_habit(&habit_id, &name).map_err(|e| e.to_string())
}

#[tauri::command]
fn reorder_habits(
    state: State<'_, AppState>,
    ordered_ids: Vec<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.reorder_habits(&ordered_ids).map_err(|e| e.to_string())
}

#[tauri::command]
fn archive_habit(
    state: State<'_, AppState>,
    habit_id: String,
    archived: bool,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.archive_habit(&habit_id, archived)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_books(
    state: State<'_, AppState>,
    date: Option<String>,
) -> Result<Vec<BookProgress>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let d = date.unwrap_or_else(today_str);
    db.list_books_with_progress(&d).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_book(
    state: State<'_, AppState>,
    title: String,
    total_pages: u32,
) -> Result<Book, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_book(&title, Some(total_pages))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn log_reading(
    state: State<'_, AppState>,
    book_id: String,
    date: String,
    pages_read: u32,
    minutes_read: u32,
) -> Result<ReadingLog, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.log_reading(LogReadingInput {
        book_id,
        date,
        pages_read,
        minutes_read,
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_workout(
    state: State<'_, AppState>,
    workout_type: String,
    duration_minutes: u32,
    details_json: Option<String>,
    notes: Option<String>,
    tz_offset_minutes: Option<i32>,
) -> Result<Workout, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_workout(CreateWorkoutInput {
        workout_type,
        duration_minutes,
        details_json,
        notes,
        tz_offset_minutes: tz_offset_minutes.unwrap_or(330),
    })
    .map_err(|e| e.to_string())
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
fn search(state: State<'_, AppState>, query: String) -> Result<Vec<SearchHit>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.search_fts(&query).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_storage_stats(state: State<'_, AppState>) -> Result<StorageStats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_storage_stats().map_err(|e| e.to_string())
}

#[tauri::command]
fn seed_demo_data(state: State<'_, AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.seed_demo_data_if_empty().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_pairing_bundle(
    state: State<'_, AppState>,
    port: Option<u16>,
) -> Result<PairingBundle, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let p = port.unwrap_or(8765);
    db.create_pairing_bundle(p, "pc").map_err(|e| e.to_string())
}

#[tauri::command]
fn get_pairing_status(state: State<'_, AppState>) -> Result<PairingStatus, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_pairing_status().map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_pairing(state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.clear_pairing().map_err(|e| e.to_string())
}

#[tauri::command]
fn trigger_sync_now(state: State<'_, AppState>) -> Result<SyncSummary, String> {
    let (status, secret) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let status = db.get_pairing_status().map_err(|e| e.to_string())?;
        if !status.is_paired {
            return Err("Desktop is not paired with a mobile device yet.".into());
        }
        let secret = db
            .get_setting("pairing_secret")
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "No pairing secret found".to_string())?;
        (status, secret)
    };

    let target_addr = if let Some(addr) = status.peer_address {
        addr
    } else {
        match hashi_server::discover_peer(1500) {
            Ok((ip, beacon)) => format!("{}:{}", ip, beacon.port),
            Err(_) => "192.168.43.1:8765".to_string(),
        }
    };

    let db_ref = state.db.lock().map_err(|e| e.to_string())?;
    hashi_server::perform_full_sync(&target_addr, &secret, &db_ref)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = resolve_desktop_db_dir(app);
            let db_path = app_dir.join("hashi.db");
            let media_dir = app_dir.join("media");
            let device_id = load_or_create_device_id(&app_dir);

            let db = Database::open(&db_path, &media_dir, device_id.clone())
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

            let _ = db.seed_demo_data_if_empty();

            let db_arc = Arc::new(Mutex::new(db));

            // Start LAN HTTP Server on port 8765 (with fallback to 8766)
            let mut lan = LanServer::new(8765);
            let mut port_used = 8765;
            let lan_started = match lan.start(Arc::clone(&db_arc)) {
                Ok(_) => true,
                Err(_) => {
                    let mut fallback_lan = LanServer::new(8766);
                    if fallback_lan.start(Arc::clone(&db_arc)).is_ok() {
                        lan = fallback_lan;
                        port_used = 8766;
                        true
                    } else {
                        false
                    }
                }
            };

            // Start UDP discovery responder
            let discovery = DiscoveryServer::start(device_id, "pc".into(), port_used).ok();

            app.manage(AppState {
                db: db_arc,
                lan_server: Mutex::new(if lan_started { Some(lan) } else { None }),
                discovery_server: Mutex::new(discovery),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_home_snapshot,
            get_health_snapshot,
            list_ideas,
            create_idea,
            update_idea,
            set_idea_status,
            delete_idea,
            list_idea_revisions,
            list_meals,
            create_meal,
            delete_meal,
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
            search,
            get_storage_stats,
            seed_demo_data,
            get_pairing_bundle,
            get_pairing_status,
            clear_pairing,
            trigger_sync_now,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hashi desktop application");
}
