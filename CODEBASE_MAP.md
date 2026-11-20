# Hashi Codebase Cheatsheet

## File Map (what lives where)

### Rust Crates
| Crate | File | Key Contents | Lines |
|-------|------|-------------|-------|
| hashi-core | `src/sync.rs` | PairingBundle, PairingStatus, SyncBatch, SyncAck structs | 81 |
| hashi-core | `src/repo.rs` | Database struct, ALL CRUD, pairing, sync delta, settings | 2493 |
| hashi-core | `src/models.rs` | Data model structs (Idea, Meal, Workout, etc.) | - |
| hashi-server | `src/server.rs` | LanServer TCP HTTP, routes: /health /pair /sync/* /update/* | ~440 |
| hashi-server | `src/client.rs` | pair_with_peer(), perform_full_sync(), send_http_request() | 301 |
| hashi-server | `src/discovery.rs` | UDP broadcast DiscoveryServer + discover_peer() | - |
| hashi-server | `examples/live_server.rs` | Standalone test server for phone pairing | ~65 |

### Mobile App (apps/mobile/)
| File | Purpose |
|------|---------|
| `src/api.js` | Tauri invoke wrappers (all backend calls) | 
| `src/state.js` | App state (S object), pairWithQrPayload(), triggerMobileSync() |
| `src/main.js` | Event handlers, delegates to state.js |
| `src/components/SyncSheet.js` | Sync/pairing UI |
| `src-tauri/src/lib.rs` | ALL #[tauri::command] handlers |

### Desktop App (apps/desktop/)
| File | Purpose |
|------|---------|
| `src-tauri/src/lib.rs` | Desktop tauri commands |

## Key Structs

```rust
// crates/hashi-core/src/sync.rs
PairingBundle { device_id, role, secret, port, host_ips: Vec<String>, created_at }
PairingStatus { is_paired, peer_device_id, peer_address, role, paired_at }
SyncBatch { ... }  // delta data for sync
SyncAck { ... }    // acknowledgment
```

## Pairing Flow
1. PC runs `create_pairing_bundle(port, "pc")` -> generates secret, returns JSON
2. Phone pastes JSON into QR field OR uses manual IP+port+secret
3. Phone calls `pair_with_peer(addr, device_id, secret, "phone")` -> `POST /pair`
4. Server validates, saves pairing, returns `{status:"paired", device_id}`

## HTTP Routes (server.rs handle_client)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | /health | None | Health check + pairing status |
| POST | /pair | None | Pairing handshake |
| GET | /sync/delta?since=X | Bearer | Get changed records |
| POST | /sync/push | Bearer | Push sync batch |
| POST | /sync/ack | Bearer | Acknowledge sync |
| POST | /sync/media/:type/:id | Bearer | Upload media |
| GET | /sync/media/:type/:id | Bearer | Download media |
| GET | /update/check | None | Check if APK update available |
| GET | /update/apk | None | Download APK binary |

## Mobile Tauri Commands (apps/mobile/src-tauri/src/lib.rs)
```
pair_with_qr(qr_payload: String)     -> L284
pair_manual(host, port, secret)       -> L323
discover_and_sync()                   -> L355
check_for_update()                    -> NEW
download_update()                     -> NEW
get_pairing_status()                  -> L272
clear_pairing()                       -> L278
```

## JS API (apps/mobile/src/api.js)
```js
api.pairWithQr(qrPayload)
api.pairManual(host, port, secret)
api.discoverAndSync()
api.checkForUpdate()
api.downloadUpdate()
api.getPairingStatus()
api.clearPairing()
```

## State Object (apps/mobile/src/state.js)
```js
S.pairing = { status, error, showManual, isSyncing, syncSummary,
              updateInfo, updateError, updatePath, isCheckingUpdate, isDownloading }
S.syncStatus = { pcFound, lastSyncText }
```

## Network
- PC Wi-Fi IP: 10.71.162.203
- Default server port: 8765
- Phone+PC must share same LAN/hotspot

## Build Commands
```powershell
# Rust tests
cargo test --workspace --offline

# Start sync server (from project root)
cargo run --example live_server -p hashi-server

# Android cross-compile
cargo build --target aarch64-linux-android --lib -p hashi-mobile

# Gradle APK build (from apps/mobile/src-tauri/gen/android)
$env:ANDROID_HOME="D:\android-sdk"; $env:JAVA_HOME="D:\android-sdk\jdk-17"
.\gradlew.bat assembleArm64Debug

# APK location
apps/mobile/src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk
```

## Git
```powershell
# Push (needs bypass sandbox + ssl workaround)
git -c http.sslVerify=false push origin main
```

## Known Bugs Fixed This Session
1. create_pairing_bundle() hardcoded IPs -> now detects real LAN IPs via UDP socket trick
2. live_server printed placeholder `<PC_IP>` -> now prints real IP + full pairing JSON
3. Missing OTA update routes -> added /update/check and /update/apk to server
