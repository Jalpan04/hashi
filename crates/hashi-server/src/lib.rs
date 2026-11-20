pub mod client;
pub mod discovery;
pub mod server;

pub use client::*;
pub use discovery::*;
pub use server::*;

#[cfg(test)]
mod tests {
    use super::*;
    use hashi_core::{CreateIdeaInput, CreateMealInput, Database};
    use std::fs;
    use std::sync::{Arc, Mutex};
    use uuid::Uuid;

    fn temp_dir(label: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("hashi_srv_test_{}_{}", label, Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn full_lan_server_pairing_sync_and_purge() {
        let pc_dir = temp_dir("server_pc");
        let phone_dir = temp_dir("server_phone");

        let pc_db = Database::open(&pc_dir.join("pc.db"), &pc_dir.join("media"), "pc-1").unwrap();
        let phone_db = Database::open(&phone_dir.join("phone.db"), &phone_dir.join("media"), "phone-1").unwrap();

        // Start LanServer on an ephemeral port
        let mut server = LanServer::new(18765);
        let pc_db_arc = Arc::new(Mutex::new(pc_db));
        server.start(Arc::clone(&pc_db_arc)).unwrap();

        // 1. Initial pairing bundle from PC
        let bundle = pc_db_arc.lock().unwrap().create_pairing_bundle(18765, "pc").unwrap();
        let qr = bundle.to_qr_string().unwrap();
        let parsed = hashi_core::PairingBundle::from_qr_string(&qr).unwrap();

        // Phone initiates pairing handshake over HTTP
        let pair_res = pair_with_peer("127.0.0.1:18765", &phone_db.device_id(), &parsed.secret, "phone").unwrap();
        assert!(pair_res.contains("paired"));

        // Save pairing on phone
        phone_db.save_pairing(&parsed.device_id, &parsed.secret, Some("127.0.0.1:18765"), "phone").unwrap();

        // 2. Phone captures meal with raw photo
        let photo_bytes = vec![1, 2, 3, 4, 5, 6, 7, 8];
        let meal = phone_db.create_meal(CreateMealInput {
            meal_type: "breakfast".into(),
            user_note: Some("Avocado toast".into()),
            manual_calories: Some(400),
            photo_bytes: Some(photo_bytes.clone()),
            photo_ext: Some("jpg".into()),
            thumbnail_b64: Some("data:image/jpeg;base64,thumb".into()),
            tz_offset_minutes: 330,
        }).unwrap();

        let raw_photo_path = phone_dir.join("media").join(meal.photo_path.as_ref().unwrap());
        assert!(raw_photo_path.exists());

        // Phone captures an idea
        let idea = phone_db.create_idea(CreateIdeaInput {
            title: Some("Network architecture".into()),
            raw_text: "Pure TCP HTTP server works with zero external deps.".into(),
            tags: vec!["network".into()],
            tz_offset_minutes: 330,
        }).unwrap();

        // 3. Perform Full Sync over LAN HTTP
        let summary = perform_full_sync("127.0.0.1:18765", &parsed.secret, &phone_db).unwrap();
        assert!(summary.pushed_count >= 2);
        assert_eq!(summary.media_transferred_count, 1);

        // 4. Verify Raw Media was safely purged from phone disk, but thumbnail kept!
        assert!(!raw_photo_path.exists());
        let reloaded_phone_meal = phone_db.get_meal(&meal.sync.id).unwrap().unwrap();
        assert!(reloaded_phone_meal.photo_path.is_none());
        assert!(reloaded_phone_meal.thumbnail_b64.is_some());

        // 5. Verify PC has the meal photo in its permanent vault!
        let pc_meal = pc_db_arc.lock().unwrap().get_meal(&meal.sync.id).unwrap().unwrap();
        assert!(pc_meal.photo_path.is_some());
        let pc_photo = pc_dir.join("media").join(pc_meal.photo_path.unwrap());
        assert!(pc_photo.exists());
        assert_eq!(fs::read(&pc_photo).unwrap(), photo_bytes);

        // Verify PC has the idea
        let pc_idea = pc_db_arc.lock().unwrap().get_idea(&idea.sync.id).unwrap().unwrap();
        assert_eq!(pc_idea.raw_text, "Pure TCP HTTP server works with zero external deps.");

        server.stop();
        let _ = fs::remove_dir_all(&pc_dir);
        let _ = fs::remove_dir_all(&phone_dir);
    }
}
