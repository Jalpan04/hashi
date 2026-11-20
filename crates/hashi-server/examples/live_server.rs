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

    let port: u16 = std::env::args().nth(1).and_then(|s| s.parse().ok()).unwrap_or(8765);

    let mut server = LanServer::new(port);
    // Enable OTA APK serving from the current working directory
    if let Ok(cwd) = std::env::current_dir() {
        server.set_apk_dir(cwd);
    }
    server.start(Arc::clone(&db_arc)).expect("Failed to start LAN HTTP server");
    let _discovery = DiscoveryServer::start("desktop-test".into(), "pc".into(), port).expect("Failed to start UDP discovery");

    let bundle = db_arc.lock().unwrap().create_pairing_bundle(port, "pc").unwrap();
    let qr_json = bundle.to_qr_string().unwrap();

    // Detect primary LAN IP for display
    let display_ip = bundle.host_ips.first().cloned().unwrap_or_else(|| "127.0.0.1".into());

    println!("========================================================");
    println!("Hashi LAN Server is active on port {}", port);
    println!("Your LAN IP     : {}", display_ip);
    println!("Device ID       : {}", bundle.device_id);
    println!("Pairing Secret  : {}", bundle.secret);
    println!("Health Check    : http://{}:{}/health", display_ip, port);
    println!("========================================================");
    println!();
    println!("--- PAIRING PAYLOAD (copy this entire JSON into the mobile app) ---");
    println!("{}", qr_json);
    println!("--- END PAYLOAD ---");
    println!();
    println!("Or use Manual IP entry on phone:");
    println!("  IP     : {}", display_ip);
    println!("  Port   : {}", port);
    println!("  Secret : {}", bundle.secret);
    println!();

    // Serve APK updates if the file exists in project root
    let apk_path = std::env::current_dir()
        .ok()
        .map(|d| d.join("hashi-mobile-arm64-debug.apk"))
        .unwrap_or_default();
    if apk_path.exists() {
        println!("APK Update      : http://{}:{}/update/apk ({:.1} MB)", display_ip, port, apk_path.metadata().map(|m| m.len() as f64 / 1_048_576.0).unwrap_or(0.0));
    } else {
        println!("APK Update      : No APK found at {:?} (place hashi-mobile-arm64-debug.apk in project root)", apk_path);
    }

    println!();
    println!("Press Ctrl+C to stop.");

    loop {
        std::thread::sleep(Duration::from_secs(1));
    }
}
