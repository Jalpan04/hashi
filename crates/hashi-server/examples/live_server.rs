use hashi_core::Database;
use hashi_server::{DiscoveryServer, LanServer};
use std::sync::{Arc, Mutex};
use std::time::Duration;

fn main() {
    let temp_dir = std::env::temp_dir().join("hashi_live_probe");
    let _ = std::fs::create_dir_all(&temp_dir);
    let db = Database::open(&temp_dir.join("live.db"), &temp_dir.join("media"), "desktop-test").unwrap();
    let _ = db.seed_demo_data_if_empty();
    let db_arc = Arc::new(Mutex::new(db));

    let mut server = LanServer::new(8765);
    server.start(Arc::clone(&db_arc)).expect("Failed to start LAN HTTP server on 8765");
    let _discovery = DiscoveryServer::start("desktop-test".into(), "pc".into(), 8765).expect("Failed to start UDP discovery on 8765");

    let bundle = db_arc.lock().unwrap().create_pairing_bundle(8765, "pc").unwrap();

    println!("========================================================");
    println!("Hashi LAN Server is active on port 8765");
    println!("Device ID      : {}", bundle.device_id);
    println!("Pairing Secret : {}", bundle.secret);
    println!("Health Check   : http://<PC_IP>:8765/health");
    println!("Pairing Route  : POST http://<PC_IP>:8765/pair");
    println!("========================================================");
    println!("Press Ctrl+C to stop.");

    loop {
        std::thread::sleep(Duration::from_secs(1));
    }
}
