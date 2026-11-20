use base64::Engine;
use hashi_core::{
    Book, BookProgress, CreateIdeaInput, CreateMealInput, CreateVoiceInput, CreateWorkoutInput,
    Database, Habit, HabitWithStatus, HealthSnapshot, HomeSnapshot, Idea, IdeaRevision,
    LogReadingInput, Meal, PairingBundle, PairingStatus, ReadingLog, StorageStats, UpdateIdeaInput,
    VoiceJournalEntry, Workout,
};
use hashi_server::SyncSummary;
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
fn pair_with_qr(state: State<'_, AppState>, qr_payload: String) -> Result<String, String> {
    let trimmed = qr_payload.trim();
    let bundle = if let Ok(b) = PairingBundle::from_qr_string(trimmed) {
        b
    } else {
        // Fallback: User typed an IP address, port, or host:port directly into the box!
        let clean = trimmed.trim_start_matches("http://").trim_start_matches("https://");
        let (host, port) = if let Some(idx) = clean.find(':') {
            let h = clean[..idx].trim();
            let p: u16 = clean[idx + 1..].trim().parse().unwrap_or(8765);
            (h.to_string(), p)
        } else if clean.chars().all(|c| c.is_ascii_digit()) && !clean.is_empty() {
            // User typed a port number like "8942" or "8765"
            let p: u16 = clean.parse().unwrap_or(8765);
            ("10.71.162.203".to_string(), p)
        } else if !clean.is_empty() {
            (clean.to_string(), 8765)
        } else {
            return Err("Pairing input was empty".into());
        };

        PairingBundle {
            device_id: "pc".to_string(),
            role: "pc".to_string(),
            secret: String::new(),
            port,
            host_ips: vec![host, "10.71.162.203".to_string(), "192.168.43.1".to_string()],
            created_at: String::new(),
        }
    };

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = db.device_id().to_string();

    let mut paired_addr = None;
    let mut resolved_secret = bundle.secret.clone();
    let mut resolved_peer_id = bundle.device_id.clone();

    for host in &bundle.host_ips {
        let addr = format!("{}:{}", host, bundle.port);
        if let Ok(res_str) = hashi_server::pair_with_peer(&addr, &device_id, &bundle.secret, "phone") {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&res_str) {
                if let Some(s) = val.get("secret").and_then(|v| v.as_str()) {
                    resolved_secret = s.to_string();
                }
                if let Some(id) = val.get("device_id").and_then(|v| v.as_str()) {
                    resolved_peer_id = id.to_string();
                }
            }
            paired_addr = Some(addr);
            break;
        }
    }

    if paired_addr.is_none() {
        let gw_addr = format!("192.168.43.1:{}", bundle.port);
        if let Ok(res_str) = hashi_server::pair_with_peer(&gw_addr, &device_id, &bundle.secret, "phone") {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&res_str) {
                if let Some(s) = val.get("secret").and_then(|v| v.as_str()) {
                    resolved_secret = s.to_string();
                }
                if let Some(id) = val.get("device_id").and_then(|v| v.as_str()) {
                    resolved_peer_id = id.to_string();
                }
            }
            paired_addr = Some(gw_addr);
        }
    }

    let final_addr = paired_addr.ok_or_else(|| {
        format!(
            "Could not connect to PC at {} (port {}). Ensure PC server is running.",
            bundle.host_ips.join(", "),
            bundle.port
        )
    })?;

    db.save_pairing(&resolved_peer_id, &resolved_secret, Some(&final_addr), "phone")
        .map_err(|e| e.to_string())?;

    Ok(format!("Paired successfully with PC ({}) at {}", resolved_peer_id, final_addr))
}

#[tauri::command]
fn pair_manual(
    state: State<'_, AppState>,
    host: String,
    port: u16,
    secret: String,
) -> Result<String, String> {
    let clean_host = host.trim();
    let addr = format!("{}:{}", clean_host, port);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = db.device_id().to_string();

    let peer_res = hashi_server::pair_with_peer(&addr, &device_id, &secret, "phone");
    let (peer_id, effective_secret) = match peer_res {
        Ok(json_str) => {
            let val = serde_json::from_str::<serde_json::Value>(&json_str).ok();
            let pid = val.as_ref()
                .and_then(|v| v.get("device_id").and_then(|d| d.as_str().map(|s| s.to_string())))
                .unwrap_or_else(|| "pc".to_string());
            let sec = val.as_ref()
                .and_then(|v| v.get("secret").and_then(|s| s.as_str().map(|s| s.to_string())))
                .unwrap_or(secret);
            (pid, sec)
        }
        Err(e) => {
            return Err(format!("Could not connect to {}: {}", addr, e));
        }
    };

    db.save_pairing(&peer_id, &effective_secret, Some(&addr), "phone")
        .map_err(|e| e.to_string())?;

    Ok(format!("Paired successfully with {}", addr))
}

#[tauri::command]
fn discover_and_sync(state: State<'_, AppState>) -> Result<SyncSummary, String> {
    let (secret, saved_peer_addr) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let status = db.get_pairing_status().map_err(|e| e.to_string())?;
        if !status.is_paired {
            return Err("Device not paired yet. Please scan the pairing QR code from your PC.".into());
        }
        let s = db
            .get_setting("pairing_secret")
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Pairing secret missing".to_string())?;
        (s, status.peer_address)
    };

    let target_addr = if let Ok((ip, beacon)) = hashi_server::discover_peer(1500) {
        format!("{}:{}", ip, beacon.port)
    } else if let Some(addr) = saved_peer_addr {
        addr
    } else {
        "192.168.43.1:8765".to_string()
    };

    let db = state.db.lock().map_err(|e| e.to_string())?;
    hashi_server::perform_full_sync(&target_addr, &secret, &db)
}

// --- OTA Update Commands ---

#[tauri::command]
fn check_for_update(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let peer_addr = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let status = db.get_pairing_status().map_err(|e| e.to_string())?;
        if !status.is_paired {
            return Err("Not paired with PC. Pair first to check for updates.".into());
        }
        status.peer_address.ok_or_else(|| "No peer address saved".to_string())?
    };

    let resp = hashi_server::send_http_request(
        &peer_addr, "GET", "/update/check", &[], &[],
    ).map_err(|e| format!("Could not reach PC server: {}", e))?;

    if resp.status_code == 200 {
        let val: serde_json::Value = serde_json::from_slice(&resp.body)
            .map_err(|e| e.to_string())?;
        Ok(val)
    } else {
        Err(format!("Server returned HTTP {}", resp.status_code))
    }
}

#[tauri::command]
fn download_update(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let peer_addr = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let status = db.get_pairing_status().map_err(|e| e.to_string())?;
        if !status.is_paired {
            return Err("Not paired with PC".into());
        }
        status.peer_address.ok_or_else(|| "No peer address saved".to_string())?
    };

    let resp = hashi_server::send_http_request(
        &peer_addr, "GET", "/update/apk", &[], &[],
    ).map_err(|e| format!("Download failed: {}", e))?;

    if resp.status_code != 200 {
        return Err(format!("Server returned HTTP {}", resp.status_code));
    }

    // Save APK to app cache directory
    let cache_dir = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    let _ = fs::create_dir_all(&cache_dir);
    let apk_path = cache_dir.join("hashi-update.apk");
    fs::write(&apk_path, &resp.body).map_err(|e| format!("Failed to save APK: {}", e))?;

    Ok(apk_path.to_string_lossy().to_string())
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
            get_pairing_status,
            clear_pairing,
            pair_with_qr,
            pair_manual,
            discover_and_sync,
            check_for_update,
            download_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hashi mobile application");
}
