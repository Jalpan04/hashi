# Hashi Edit Cheatsheet - Where To Change What

## "I need to add a new Tauri command"
1. Add `fn my_cmd(...)` with `#[tauri::command]` in `apps/mobile/src-tauri/src/lib.rs`
2. Register it in the `generate_handler![...]` list (bottom of same file, ~L435)
3. Add JS wrapper in `apps/mobile/src/api.js` at the `api` object (~L83)
4. Call it from state.js or main.js

## "I need to add a new HTTP route to the server"
1. Add handler in `crates/hashi-server/src/server.rs` inside `handle_client()` (~L178+)
2. Pattern: `if req.method == "X" && req.path == "/foo" { ... send_response(...); return; }`
3. Put it BEFORE the final `send_response(... "404 Not Found" ...)` at end of file

## "I need to change the Sync Sheet UI"
- Edit `apps/mobile/src/components/SyncSheet.js`
- Event handlers for `data-action="xxx"` go in `apps/mobile/src/main.js` (~L750+)
- State mutations go in `apps/mobile/src/state.js`

## "I need to change the pairing logic"
- PairingBundle struct: `crates/hashi-core/src/sync.rs:5`
- Bundle creation: `crates/hashi-core/src/repo.rs:1317` (create_pairing_bundle)
- Server /pair handler: `crates/hashi-server/src/server.rs:~210`
- Client pair_with_peer: `crates/hashi-server/src/client.rs:126`
- Mobile pair_with_qr cmd: `apps/mobile/src-tauri/src/lib.rs:284`
- Mobile pair_manual cmd: `apps/mobile/src-tauri/src/lib.rs:323`

## "I need to add a new data model / CRUD"
1. Add struct in `crates/hashi-core/src/models.rs`
2. Add table creation SQL in `crates/hashi-core/src/repo.rs` init_tables()
3. Add CRUD methods on `Database` impl in repo.rs
4. Add tauri command in `apps/mobile/src-tauri/src/lib.rs`
5. Add JS api wrapper in `apps/mobile/src/api.js`

## "I need to rebuild the APK after code changes"
### If only JS/HTML changed:
```powershell
cd apps/mobile
pnpm build   # rebuilds web assets into dist/
# Copy dist/ to gen/android/app/src/main/assets/
# Then: gradlew.bat assembleArm64Debug
```

### If Rust code changed:
```powershell
# Recompile native lib
$env:ANDROID_HOME="D:\android-sdk"
$env:NDK_HOME="D:\android-sdk\ndk\26.1.10909125"
cargo build --target aarch64-linux-android --lib -p hashi-mobile

# Copy .so to jniLibs
Copy-Item target\aarch64-linux-android\debug\libhashi_mobile_lib.so `
  apps\mobile\src-tauri\gen\android\app\src\main\jniLibs\arm64-v8a\

# Rebuild APK
cd apps\mobile\src-tauri\gen\android
.\gradlew.bat assembleArm64Debug
```

## "I need to test the server locally"
```powershell
cargo run --example live_server -p hashi-server
# Prints: real LAN IP, pairing secret, full JSON payload to paste
```

## Key File Line References
| What | File | Line |
|------|------|------|
| PairingBundle struct | hashi-core/src/sync.rs | 5 |
| create_pairing_bundle | hashi-core/src/repo.rs | 1317 |
| LanServer::start | hashi-server/src/server.rs | 139 |
| handle_client entry | hashi-server/src/server.rs | 178 |
| /pair route | hashi-server/src/server.rs | ~210 |
| /update/check route | hashi-server/src/server.rs | ~390 |
| /update/apk route | hashi-server/src/server.rs | ~420 |
| pair_with_qr cmd | mobile/src-tauri/src/lib.rs | 284 |
| pair_manual cmd | mobile/src-tauri/src/lib.rs | 323 |
| discover_and_sync cmd | mobile/src-tauri/src/lib.rs | 355 |
| check_for_update cmd | mobile/src-tauri/src/lib.rs | ~385 |
| SyncSheet render | mobile/src/components/SyncSheet.js | 4 |
| Sync event handlers | mobile/src/main.js | 752+ |
| State pairing funcs | mobile/src/state.js | 114+ |
| API object | mobile/src/api.js | 60-85 |
