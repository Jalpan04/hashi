use hashi_core::{
    Database, PairingHandshakeRequest, SyncApplyResult, SyncBatch,
};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpStream;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncSummary {
    pub pushed_count: usize,
    pub pulled_count: usize,
    pub conflicts_count: usize,
    pub media_transferred_count: usize,
    pub status: String,
}

pub struct HttpResponse {
    pub status_code: u16,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

impl HttpResponse {
    pub fn header(&self, name: &str) -> Option<&str> {
        let name_l = name.to_lowercase();
        self.headers
            .iter()
            .find(|(k, _)| k.to_lowercase() == name_l)
            .map(|(_, v)| v.as_str())
    }
}

pub fn parse_host_port(addr: &str) -> (String, u16) {
    let clean = addr.trim().trim_start_matches("http://").trim_start_matches("https://");
    if let Some(idx) = clean.find(':') {
        let host = clean[..idx].to_string();
        let port = clean[idx + 1..].parse().unwrap_or(8765);
        (host, port)
    } else {
        (clean.to_string(), 8765)
    }
}

pub fn send_http_request(
    addr: &str,
    method: &str,
    path: &str,
    headers: &[(&str, &str)],
    body: &[u8],
) -> Result<HttpResponse, String> {
    let (host, port) = parse_host_port(addr);
    let mut stream = TcpStream::connect((host.as_str(), port))
        .map_err(|e| format!("Connection failed to {}:{}: {}", host, port, e))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(15)))
        .map_err(|e| e.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(15)))
        .map_err(|e| e.to_string())?;

    let mut req_header = format!(
        "{} {} HTTP/1.1\r\nHost: {}:{}\r\nContent-Length: {}\r\nConnection: close\r\n",
        method,
        path,
        host,
        port,
        body.len()
    );
    for (k, v) in headers {
        req_header.push_str(&format!("{}: {}\r\n", k, v));
    }
    req_header.push_str("\r\n");

    stream.write_all(req_header.as_bytes()).map_err(|e| e.to_string())?;
    if !body.is_empty() {
        stream.write_all(body).map_err(|e| e.to_string())?;
    }
    stream.flush().map_err(|e| e.to_string())?;

    let mut reader = BufReader::new(stream);
    let mut status_line = String::new();
    reader.read_line(&mut status_line).map_err(|e| e.to_string())?;

    let status_parts: Vec<&str> = status_line.split_whitespace().collect();
    if status_parts.len() < 2 {
        return Err("Invalid HTTP response".into());
    }
    let status_code: u16 = status_parts[1].parse().map_err(|_| "Invalid status code")?;

    let mut resp_headers = Vec::new();
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
            resp_headers.push((k, v));
        }
    }

    let mut resp_body = Vec::new();
    if content_length > 0 {
        resp_body.resize(content_length, 0);
        reader.read_exact(&mut resp_body).map_err(|e| e.to_string())?;
    } else {
        let _ = reader.read_to_end(&mut resp_body);
    }

    Ok(HttpResponse {
        status_code,
        headers: resp_headers,
        body: resp_body,
    })
}

pub fn pair_with_peer(
    peer_addr: &str,
    my_device_id: &str,
    pairing_secret: &str,
    my_role: &str,
) -> Result<String, String> {
    let payload = PairingHandshakeRequest {
        device_id: my_device_id.to_string(),
        role: my_role.to_string(),
        secret: pairing_secret.to_string(),
    };
    let body = serde_json::to_vec(&payload).map_err(|e| e.to_string())?;

    let resp = send_http_request(
        peer_addr,
        "POST",
        "/pair",
        &[("Content-Type", "application/json")],
        &body,
    )?;

    if resp.status_code == 200 {
        let text = String::from_utf8_lossy(&resp.body);
        Ok(text.to_string())
    } else {
        Err(format!(
            "Pairing rejected (HTTP {}): {}",
            resp.status_code,
            String::from_utf8_lossy(&resp.body)
        ))
    }
}

pub fn perform_full_sync(
    peer_addr: &str,
    shared_secret: &str,
    db: &Database,
) -> Result<SyncSummary, String> {
    let auth_header = format!("Bearer {}", shared_secret);

    // 1. Health & Connection check
    let health = send_http_request(
        peer_addr,
        "GET",
        "/health",
        &[("Authorization", &auth_header)],
        &[],
    )?;
    if health.status_code != 200 {
        return Err(format!(
            "Peer health check failed (HTTP {}): {}",
            health.status_code,
            String::from_utf8_lossy(&health.body)
        ));
    }

    let mut pushed_count = 0;
    let mut conflicts_count = 0;

    // 2. Push local delta to peer
    let last_synced_at = db.get_setting("last_synced_at").ok().flatten();
    let local_delta = db
        .extract_delta(last_synced_at.as_deref())
        .map_err(|e| e.to_string())?;

    if !local_delta.ideas.is_empty()
        || !local_delta.meals.is_empty()
        || !local_delta.voice_entries.is_empty()
        || !local_delta.habits.is_empty()
        || !local_delta.habit_checks.is_empty()
        || !local_delta.workouts.is_empty()
        || !local_delta.health_metrics.is_empty()
        || !local_delta.books.is_empty()
        || !local_delta.reading_logs.is_empty()
    {
        let push_body = serde_json::to_vec(&local_delta).map_err(|e| e.to_string())?;
        let push_resp = send_http_request(
            peer_addr,
            "POST",
            "/sync/push",
            &[
                ("Content-Type", "application/json"),
                ("Authorization", &auth_header),
            ],
            &push_body,
        )?;

        if push_resp.status_code == 200 {
            let apply_res: SyncApplyResult =
                serde_json::from_slice(&push_resp.body).map_err(|e| e.to_string())?;
            pushed_count = apply_res.applied_count;
            conflicts_count = apply_res.conflicts.len();
            db.acknowledge_sync(&apply_res.ack)
                .map_err(|e| e.to_string())?;
        } else {
            return Err(format!(
                "Push delta failed (HTTP {}): {}",
                push_resp.status_code,
                String::from_utf8_lossy(&push_resp.body)
            ));
        }
    }

    // 3. Pull remote delta from peer
    let pull_path = match last_synced_at.as_deref() {
        Some(ts) => format!("/sync/delta?since={}", ts),
        None => "/sync/delta".to_string(),
    };
    let pull_resp = send_http_request(
        peer_addr,
        "GET",
        &pull_path,
        &[("Authorization", &auth_header)],
        &[],
    )?;

    let mut pulled_count = 0;
    if pull_resp.status_code == 200 {
        let remote_delta: SyncBatch =
            serde_json::from_slice(&pull_resp.body).map_err(|e| e.to_string())?;
        let apply_result = db
            .apply_sync_batch(remote_delta)
            .map_err(|e| e.to_string())?;
        pulled_count = apply_result.applied_count;
        conflicts_count += apply_result.conflicts.len();

        // Send ACK back to peer
        let ack_body = serde_json::to_vec(&apply_result.ack).map_err(|e| e.to_string())?;
        let _ = send_http_request(
            peer_addr,
            "POST",
            "/sync/ack",
            &[
                ("Content-Type", "application/json"),
                ("Authorization", &auth_header),
            ],
            &ack_body,
        );
    }

    // 4. Transfer pending media files and safely purge on phone
    let mut media_transferred_count = 0;
    let pending_media = db.list_pending_media().map_err(|e| e.to_string())?;

    for item in pending_media {
        let path = std::path::Path::new(&item.file_path);
        if let Ok(bytes) = std::fs::read(path) {
            let media_path = format!("/sync/media/{}/{}", item.media_type, item.record_id);
            let upload_resp = send_http_request(
                peer_addr,
                "POST",
                &media_path,
                &[
                    ("Content-Type", "application/octet-stream"),
                    ("Authorization", &auth_header),
                    ("X-Sha256", &item.sha256),
                ],
                &bytes,
            )?;

            if upload_resp.status_code == 200 {
                // Peer confirmed storage! Purge raw file from local phone storage
                let _ = db.purge_local_media(&item.media_type, &item.record_id, &item.sha256);
                media_transferred_count += 1;
            }
        }
    }

    Ok(SyncSummary {
        pushed_count,
        pulled_count,
        conflicts_count,
        media_transferred_count,
        status: "complete".to_string(),
    })
}
