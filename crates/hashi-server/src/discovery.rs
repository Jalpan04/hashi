use serde::{Deserialize, Serialize};
use std::net::{SocketAddr, UdpSocket};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

pub const DEFAULT_DISCOVERY_PORT: u16 = 8765;
pub const DISCOVERY_MAGIC_PING: &str = "HASHI_DISCOVERY_PING";
pub const DISCOVERY_MAGIC_PREFIX: &str = "HASHI_BEACON:";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveryBeacon {
    pub device_id: String,
    pub role: String,
    pub port: u16,
}

pub struct DiscoveryServer {
    running: Arc<AtomicBool>,
}

impl DiscoveryServer {
    pub fn start(device_id: String, role: String, http_port: u16) -> Result<Self, String> {
        let socket = UdpSocket::bind(("0.0.0.0", DEFAULT_DISCOVERY_PORT))
            .map_err(|e| format!("Failed to bind UDP discovery port {}: {}", DEFAULT_DISCOVERY_PORT, e))?;
        socket
            .set_read_timeout(Some(Duration::from_millis(500)))
            .map_err(|e| e.to_string())?;

        let running = Arc::new(AtomicBool::new(true));
        let running_clone = Arc::clone(&running);

        let beacon = DiscoveryBeacon {
            device_id,
            role,
            port: http_port,
        };
        let response_payload = format!(
            "{}{}",
            DISCOVERY_MAGIC_PREFIX,
            serde_json::to_string(&beacon).unwrap_or_default()
        );

        thread::spawn(move || {
            let mut buf = [0u8; 1024];
            while running_clone.load(Ordering::Relaxed) {
                if let Ok((len, src)) = socket.recv_from(&mut buf) {
                    if let Ok(msg) = std::str::from_utf8(&buf[..len]) {
                        if msg.trim() == DISCOVERY_MAGIC_PING {
                            let _ = socket.send_to(response_payload.as_bytes(), src);
                        }
                    }
                }
            }
        });

        Ok(Self { running })
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::Relaxed);
    }
}

pub fn discover_peer(timeout_ms: u64) -> Result<(String, DiscoveryBeacon), String> {
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    socket.set_broadcast(true).map_err(|e| e.to_string())?;
    socket
        .set_read_timeout(Some(Duration::from_millis(timeout_ms)))
        .map_err(|e| e.to_string())?;

    let ping = DISCOVERY_MAGIC_PING.as_bytes();
    // Broadcast to standard broadcast and hotspot subnet broadcast
    let broadcast_addrs = [
        format!("255.255.255.255:{}", DEFAULT_DISCOVERY_PORT),
        format!("192.168.43.255:{}", DEFAULT_DISCOVERY_PORT),
        format!("127.0.0.1:{}", DEFAULT_DISCOVERY_PORT),
    ];

    for addr in &broadcast_addrs {
        let _ = socket.send_to(ping, addr);
    }

    let mut buf = [0u8; 1024];
    let start = std::time::Instant::now();
    while start.elapsed() < Duration::from_millis(timeout_ms) {
        if let Ok((len, src)) = socket.recv_from(&mut buf) {
            if let Ok(msg) = std::str::from_utf8(&buf[..len]) {
                if let Some(json_str) = msg.strip_prefix(DISCOVERY_MAGIC_PREFIX) {
                    if let Ok(beacon) = serde_json::from_str::<DiscoveryBeacon>(json_str) {
                        let ip = match src {
                            SocketAddr::V4(v4) => v4.ip().to_string(),
                            SocketAddr::V6(v6) => v6.ip().to_string(),
                        };
                        return Ok((ip, beacon));
                    }
                }
            }
        }
    }

    Err("Discovery timeout: no peer responded on the hotspot network".into())
}
