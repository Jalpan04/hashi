use hashi_core::{
    Database, PairingHandshakeRequest, SyncAck, SyncBatch,
};
use sha2::{Digest, Sha256};
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{IpAddr, SocketAddr, TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

pub struct LanServer {
    pub port: u16,
    running: Arc<AtomicBool>,
    apk_dir: Option<std::path::PathBuf>,
}

fn is_private_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_loopback()
                || v4.is_private()
                || v4.octets()[0] == 10
                || (v4.octets()[0] == 172 && (16..=31).contains(&v4.octets()[1]))
                || (v4.octets()[0] == 192 && v4.octets()[1] == 168)
        }
        IpAddr::V6(v6) => v6.is_loopback(),
    }
}

struct HttpRequest {
    method: String,
    path: String,
    query: Option<String>,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
}

impl HttpRequest {
    fn header(&self, name: &str) -> Option<&str> {
        let name_l = name.to_lowercase();
        self.headers
            .iter()
            .find(|(k, _)| k.to_lowercase() == name_l)
            .map(|(_, v)| v.as_str())
    }
}

fn send_response(mut stream: &TcpStream, status: &str, content_type: &str, body: &[u8], headers: &[(&str, &str)]) {
    let mut resp = format!(
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n",
        status,
        content_type,
        body.len()
    );
    for (k, v) in headers {
        resp.push_str(&format!("{}: {}\r\n", k, v));
    }
    resp.push_str("\r\n");

    let _ = stream.write_all(resp.as_bytes());
    let _ = stream.write_all(body);
    let _ = stream.flush();
}

fn parse_request(stream: &mut TcpStream) -> Result<HttpRequest, String> {
    let mut reader = BufReader::new(stream);
    let mut request_line = String::new();
    reader
        .read_line(&mut request_line)
        .map_err(|e| e.to_string())?;

    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        return Err("Invalid HTTP request line".into());
    }
    let method = parts[0].to_uppercase();
    let full_uri = parts[1];
    let (path, query) = match full_uri.find('?') {
        Some(idx) => (
            full_uri[..idx].to_string(),
            Some(full_uri[idx + 1..].to_string()),
        ),
        None => (full_uri.to_string(), None),
    };

    let mut headers = Vec::new();
    let mut content_length = 0usize;

    loop {
        let mut line = String::new();
        reader.read_line(&mut line).map_err(|e| e.to_string())?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            break;
        }
        if let Some(idx) = trimmed.find(':') {
            let k = trimmed[..idx].trim().to_string();
            let v = trimmed[idx + 1..].trim().to_string();
            if k.eq_ignore_ascii_case("content-length") {
                content_length = v.parse().unwrap_or(0);
            }
            headers.push((k, v));
        }
    }

    let mut body = vec![0u8; content_length];
    if content_length > 0 {
        reader
            .read_exact(&mut body)
            .map_err(|e| format!("Failed to read body: {}", e))?;
    }

    Ok(HttpRequest {
        method,
        path,
        query,
        headers,
        body,
    })
}

impl LanServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            running: Arc::new(AtomicBool::new(false)),
            apk_dir: None,
        }
    }

    /// Set directory where hashi-mobile-arm64-debug.apk lives for OTA updates
    pub fn set_apk_dir(&mut self, dir: std::path::PathBuf) {
        self.apk_dir = Some(dir);
    }

    pub fn start(&mut self, db: Arc<Mutex<Database>>) -> Result<(), String> {
        let apk_dir = self.apk_dir.clone();
        let listener = TcpListener::bind(("0.0.0.0", self.port))
            .map_err(|e| format!("Failed to bind TCP port {}: {}", self.port, e))?;
        listener
            .set_nonblocking(true)
            .map_err(|e| e.to_string())?;

        let running = Arc::clone(&self.running);
        running.store(true, Ordering::Relaxed);

        let apk_dir_arc: Arc<Option<std::path::PathBuf>> = Arc::new(apk_dir);
        thread::spawn(move || {
            while running.load(Ordering::Relaxed) {
                match listener.accept() {
                    Ok((mut stream, peer_addr)) => {
                        let db_clone = Arc::clone(&db);
                        let apk_clone = Arc::clone(&apk_dir_arc);
                        thread::spawn(move || {
                            handle_client(&mut stream, peer_addr, db_clone, &apk_clone);
                        });
                    }
                    Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(100));
                    }
                    Err(_) => {
                        thread::sleep(Duration::from_millis(100));
                    }
                }
            }
        });

        Ok(())
    }

    pub fn stop(&mut self) {
        self.running.store(false, Ordering::Relaxed);
    }
}

fn handle_client(stream: &mut TcpStream, peer: SocketAddr, db: Arc<Mutex<Database>>, apk_dir: &Option<std::path::PathBuf>) {
    // 1. IP Check: Refuse public networks per Section 5.1
    if !is_private_ip(peer.ip()) {
        send_response(stream, "403 Forbidden", "text/plain", b"Access denied: non-private network", &[]);
        return;
    }

    let req = match parse_request(stream) {
        Ok(r) => r,
        Err(_) => {
            send_response(stream, "400 Bad Request", "text/plain", b"Invalid request", &[]);
            return;
        }
    };

    // 2. Health check endpoint (open to discovery probes)
    if req.method == "GET" && (req.path == "/health" || req.path == "/ping") {
        let db_lock = db.lock().unwrap();
        let status = db_lock.get_pairing_status().unwrap_or(hashi_core::PairingStatus {
            is_paired: false,
            peer_device_id: None,
            peer_address: None,
            role: None,
            paired_at: None,
        });
        let resp = serde_json::json!({
            "status": "ok",
            "is_paired": status.is_paired,
            "device_id": db_lock.device_id(),
            "role": status.role.unwrap_or_else(|| "pc".into())
        });
        send_response(stream, "200 OK", "application/json", resp.to_string().as_bytes(), &[]);
        return;
    }

    // 3. Pairing handshake
    if req.method == "POST" && req.path == "/pair" {
        let payload: Result<PairingHandshakeRequest, _> = serde_json::from_slice(&req.body);
        match payload {
            Ok(p) => {
                let db_lock = db.lock().unwrap();
                // Check if existing secret matches or if server is unpaired
                let current_secret = db_lock.get_setting("pairing_secret").unwrap_or(None);
                if let Some(ref expected) = current_secret {
                    if !p.secret.is_empty() && !expected.is_empty() && expected != &p.secret {
                        send_response(stream, "401 Unauthorized", "text/plain", b"Invalid pairing secret", &[]);
                        return;
                    }
                }
                let effective_secret = if !p.secret.is_empty() {
                    p.secret.clone()
                } else if let Some(ref exp) = current_secret {
                    exp.clone()
                } else {
                    let new_sec = "hashi-default-secret".to_string();
                    let _ = db_lock.set_setting("pairing_secret", &new_sec);
                    new_sec
                };
                let _ = db_lock.save_pairing(&p.device_id, &effective_secret, Some(&peer.to_string()), &p.role);
                let resp = serde_json::json!({
                    "status": "paired",
                    "device_id": db_lock.device_id(),
                    "role": "pc",
                    "secret": effective_secret
                });
                send_response(stream, "200 OK", "application/json", resp.to_string().as_bytes(), &[]);
            }
            Err(e) => {
                let err_msg = format!("Malformed pairing payload: {}", e);
                send_response(stream, "400 Bad Request", "text/plain", err_msg.as_bytes(), &[]);
            }
        }
        return;
    }

    // 4. Authenticate all /sync/* routes with shared pairing secret
    let auth = req.header("authorization");
    let is_authorized = {
        let db_lock = db.lock().unwrap();
        if let Ok(Some(secret)) = db_lock.get_setting("pairing_secret") {
            let expected_bearer = format!("Bearer {}", secret);
            auth == Some(expected_bearer.as_str()) || auth == Some(secret.as_str())
        } else {
            false
        }
    };

    if !is_authorized {
        send_response(stream, "401 Unauthorized", "text/plain", b"Unauthorized: peer not paired", &[]);
        return;
    }

    // 5. Sync delta extraction (GET /sync/delta)
    if req.method == "GET" && req.path == "/sync/delta" {
        let since = req.query.as_ref().and_then(|q| {
            for param in q.split('&') {
                if let Some(val) = param.strip_prefix("since=") {
                    return Some(val.to_string());
                }
            }
            None
        });

        let db_lock = db.lock().unwrap();
        match db_lock.extract_delta(since.as_deref()) {
            Ok(batch) => {
                let json = serde_json::to_string(&batch).unwrap_or_default();
                send_response(stream, "200 OK", "application/json", json.as_bytes(), &[]);
            }
            Err(e) => {
                send_response(stream, "500 Internal Error", "text/plain", e.to_string().as_bytes(), &[]);
            }
        }
        return;
    }

    // 6. Sync push (POST /sync/push)
    if req.method == "POST" && req.path == "/sync/push" {
        let batch_res: Result<SyncBatch, _> = serde_json::from_slice(&req.body);
        match batch_res {
            Ok(batch) => {
                let db_lock = db.lock().unwrap();
                match db_lock.apply_sync_batch(batch) {
                    Ok(result) => {
                        let json = serde_json::to_string(&result).unwrap_or_default();
                        send_response(stream, "200 OK", "application/json", json.as_bytes(), &[]);
                    }
                    Err(e) => {
                        send_response(stream, "500 Internal Error", "text/plain", e.to_string().as_bytes(), &[]);
                    }
                }
            }
            Err(e) => {
                let err_msg = format!("Malformed sync batch: {}", e);
                send_response(stream, "400 Bad Request", "text/plain", err_msg.as_bytes(), &[]);
            }
        }
        return;
    }

    // 7. Sync ACK (POST /sync/ack)
    if req.method == "POST" && req.path == "/sync/ack" {
        let ack_res: Result<SyncAck, _> = serde_json::from_slice(&req.body);
        match ack_res {
            Ok(ack) => {
                let db_lock = db.lock().unwrap();
                match db_lock.acknowledge_sync(&ack) {
                    Ok(_) => {
                        send_response(stream, "200 OK", "application/json", b"{\"status\":\"acknowledged\"}", &[]);
                    }
                    Err(e) => {
                        send_response(stream, "500 Internal Error", "text/plain", e.to_string().as_bytes(), &[]);
                    }
                }
            }
            Err(e) => {
                let err_msg = format!("Malformed ACK payload: {}", e);
                send_response(stream, "400 Bad Request", "text/plain", err_msg.as_bytes(), &[]);
            }
        }
        return;
    }

    // 8. Media Upload (POST /sync/media/:type/:id)
    if req.method == "POST" && req.path.starts_with("/sync/media/") {
        let segments: Vec<&str> = req.path.trim_start_matches("/sync/media/").split('/').collect();
        if segments.len() >= 2 {
            let media_type = segments[0]; // "meals" or "audio"
            let record_id = segments[1];

            let expected_sha = req.header("x-sha256").unwrap_or("");
            let computed_sha = format!("{:x}", Sha256::digest(&req.body));

            if !expected_sha.is_empty() && expected_sha != computed_sha {
                send_response(stream, "400 Bad Request", "text/plain", b"SHA-256 checksum mismatch", &[]);
                return;
            }

            let ext = match media_type {
                "meals" => "jpg",
                _ => "opus",
            };

            let db_lock = db.lock().unwrap();
            let saved_sha = match db_lock.save_incoming_media(media_type, record_id, ext, &req.body) {
                Ok(sha) => sha,
                Err(e) => {
                    send_response(stream, "500 Internal Error", "text/plain", e.to_string().as_bytes(), &[]);
                    return;
                }
            };

            let resp = serde_json::json!({
                "status": "stored",
                "sha256": saved_sha
            });
            send_response(stream, "200 OK", "application/json", resp.to_string().as_bytes(), &[]);
            return;
        }
    }

    // 9. Media Download (GET /sync/media/:type/:id)
    if req.method == "GET" && req.path.starts_with("/sync/media/") {
        let segments: Vec<&str> = req.path.trim_start_matches("/sync/media/").split('/').collect();
        if segments.len() >= 2 {
            let media_type = segments[0];
            let record_id = segments[1];

            let db_lock = db.lock().unwrap();
            if let Ok(Some((bytes, sha))) = db_lock.read_media_bytes(media_type, record_id) {
                let content_type = if media_type == "meals" { "image/jpeg" } else { "audio/ogg" };
                send_response(stream, "200 OK", content_type, &bytes, &[("X-Sha256", &sha)]);
                return;
            }

            send_response(stream, "404 Not Found", "text/plain", b"Media file not found", &[]);
            return;
        }
    }

    // 10. OTA Update check (GET /update/check) - no auth required, LAN only
    if req.method == "GET" && req.path == "/update/check" {
        if let Some(dir) = apk_dir {
            let apk_path = dir.join("hashi-mobile-arm64-debug.apk");
            if apk_path.exists() {
                let meta = std::fs::metadata(&apk_path).ok();
                let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
                let modified = meta
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                let resp = serde_json::json!({
                    "available": true,
                    "size_bytes": size,
                    "modified_epoch": modified,
                    "download_url": "/update/apk"
                });
                send_response(stream, "200 OK", "application/json", resp.to_string().as_bytes(), &[]);
                return;
            }
        }
        let resp = serde_json::json!({"available": false});
        send_response(stream, "200 OK", "application/json", resp.to_string().as_bytes(), &[]);
        return;
    }

    // 11. OTA APK download (GET /update/apk) - no auth required, LAN only
    if req.method == "GET" && req.path == "/update/apk" {
        if let Some(dir) = apk_dir {
            let apk_path = dir.join("hashi-mobile-arm64-debug.apk");
            if apk_path.exists() {
                match std::fs::read(&apk_path) {
                    Ok(bytes) => {
                        send_response(
                            stream,
                            "200 OK",
                            "application/vnd.android.package-archive",
                            &bytes,
                            &[("Content-Disposition", "attachment; filename=\"hashi-update.apk\"")],
                        );
                        return;
                    }
                    Err(e) => {
                        send_response(stream, "500 Internal Error", "text/plain", e.to_string().as_bytes(), &[]);
                        return;
                    }
                }
            }
        }
        send_response(stream, "404 Not Found", "text/plain", b"No APK available for update", &[]);
        return;
    }

    send_response(stream, "404 Not Found", "text/plain", b"Route not found", &[]);
}
