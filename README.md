# Hashi

Hashi (Japanese for "bridge") is a local-first personal capture and archive system connecting an Android phone and a PC laptop over a mobile hotspot.

- **Phone (Android):** Fast capture terminal (Meal photos, 60s voice journal, rambling notes, habit/workout logs, private habit tracker). Fully offline, sub-second cold starts.
- **PC (Windows/Linux):** Vault and nightly brain. Long-term photo/audio storage, 1:00 AM batch AI processing (meal vision macros, voice journal transcription, idea bullet structuring, weekly exercise report), desktop browsing and editing.
- **Bridge:** Hotspot sync. mDNS / UDP discovery, authenticated TLS synchronization, media file verification, ACK and phone purge.

## Architecture & Tech Stack

- **Shared Core (`crates/hashi-core`):** Rust crate for SQLite schema, migrations, domain models, sync protocol state machine, and conflict detection.
- **LAN Server (`crates/hashi-server`):** Embedded local server running in desktop background.
- **Batch Worker (`crates/hashi-batch`):** 1:00 AM nightly worker for free-tier AI processing.
- **Android Native Bridge (`plugins/tauri-plugin-hashi-native`):** Kotlin plugin for CameraX direct-to-private-storage capture, Android Health Connect reads, and WorkManager background sync.
- **Desktop App (`apps/desktop`):** Tauri v2 desktop application with modular TypeScript UI matching `Hashi_Desktop.html`.
- **Mobile App (`apps/mobile`):** Tauri v2 mobile application with modular TypeScript UI and capture sheets matching `Hashi.html`.

## Development

### Rust Core
```bash
cargo check
```

### Desktop UI
```bash
cd apps/desktop
pnpm dev # or open index.html in a browser
```

### Mobile UI
```bash
cd apps/mobile
pnpm dev # or open index.html in a browser
```

## Documentation

- [Hashi Full Project Specification.md](Hashi%20Full%20Project%20Specification.md): Complete product and engineering specification.
- [DECISIONS.md](DECISIONS.md): Architectural decisions and Android feasibility assessment.
