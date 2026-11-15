# Hashi: Full Project Specification

An Android + PC personal capture and archive system. Written as a brief for an AI coding agent. No code is included on purpose: this document says what to build, how it should behave, and in what order.

## 0. Instructions to the agent (read first)

- Two finished UI prototype files are already in the project filesystem: **Hashi.html** (Android app) and **Hashi\_Desktop.html** (desktop app). They are the visual source of truth. Port them into the real framework component by component. Keep the layout, spacing, colour tokens, fonts, copy and interaction patterns. Do not redesign.
- **What the prototype files contain:** Hashi.html is the Android app (bottom tabs Home, Ideas, Health, Journal; capture sheets for Meal, Voice, Note and Habit). Hashi\_Desktop.html is the desktop app (sidebar with Today, Food, Ideas, Journal, Health, Private; top bar with date and search; a “+ New entry” menu). Both are single-file HTML with sample data kept in browser storage. Reuse their markup, CSS and layout, but replace the sample data and browser storage with the real database and sync. Screens and controls described in this document that the prototypes do not show (Settings, the camera viewfinder, pairing, the Private unlock flow) must be built in the same visual style.
- Where this document and a prototype disagree on appearance, the prototype wins. Where they disagree on behaviour or data, this document wins.
- Build in the phases listed in section 13. Finish and confirm each phase before starting the next.
- Do not add features that are not listed here. Do not add analytics, accounts, cloud sync, social features or ads.
- If something is ambiguous, pick the simplest option, write the assumption down in a DECISIONS.md file, and continue. Section 14 records decisions the owner has already made; do not re-ask them.
- Keep the product calm and minimal: few elements per screen, sentence-case labels, no jargon, no technical status noise on the main screens.

## 1. Project overview

**Hashi** (Japanese for “bridge”) is a local-first personal system that connects an Android phone and a Windows/Linux laptop. The owner already uses the phone’s mobile hotspot as the laptop’s Wi-Fi, so the two devices are on the same small network every day.

- **Phone = fast capture terminal.** Capturing anything takes a few seconds, works fully offline, and keeps the phone light. The phone holds only small text data and short-lived raw files.
- **PC = vault and nightly brain.** The PC permanently stores photos and audio, runs all AI processing once per night at 1:00 AM, and offers a proper desktop app to browse everything.
- **Bridge = hotspot sync.** When the laptop joins the phone’s hotspot, the devices find each other, transfer data, and the phone then deletes heavy files and keeps only the processed summaries sent back by the PC.

### What the owner captures

1. **Ideas:** anything he thinks of, typed as a messy ramble. A nightly AI step turns it into clean bullet points. Editable on both phone and PC.
2. **Food:** photos taken inside the Hashi app. AI estimates calories and macros. The photo goes to the PC archive and is removed from the phone.
3. **Voice journal:** a 30-second recording, extendable to a hard maximum of 60 seconds. Used **only** for the personal journal, nowhere else. Audio archived on the PC, phone keeps the summary.
4. **Health and habits:** exercise logs, steps/sleep/heart-rate via Android Health Connect, book-reading tracker, general habits, and a private encrypted log.

### Core principles

- Capture never waits on the network, the cloud or AI.
- AI never runs when data arrives. It runs once nightly in a batch, with catch-up for anything late.
- Private data never goes to any external service.
- Free-tier AI only, no credit card attached anywhere, with hard request throttling.
- Light, fast, quiet. Small binaries, instant startup, low battery use.

## 2. Scope

**In scope:** Ideas, Voice Journal, Food, Health (Health Connect, exercise, weekly report), Habits and Reading tracker, Private log, sync, nightly batch, desktop app, mobile app.

## 3. Tech stack and repo layout

- **Language:** Rust for everything core. Do not add Python or any other language unless a task truly needs it.
- **Shared core crate (hashi-core):** SQLite schema and migrations, sync state machine, conflict detection, encryption helpers, data types shared by both apps.
- **Batch crate (hashi-batch):** the 1:00 AM worker. Runs inside the desktop app’s background process (and can also be run headless).
- **Server crate (hashi-server):** a small LAN HTTP server (axum) embedded in the desktop app that receives sync from the phone.
- **Desktop app:** Tauri v2 (Rust backend, web UI). Windows first, Linux supported. System tray icon, starts on login, keeps running in the tray so the batch and sync can run with the window closed.
- **Android app:** Tauri v2 mobile with the same web UI approach, plus a small Kotlin plugin for (a) CameraX capture straight into private app storage and (b) Android Health Connect reads. Use the audio recorder through a native plugin if the WebView route is unreliable.
- **Frontend:** SolidJS or vanilla TypeScript with plain CSS variables (Tailwind optional). Match the prototypes. No heavy UI libraries.
- **Storage:** SQLite everywhere (WAL mode), FTS5 for search, SQLCipher for the private vault table(s). Media stored as plain files on disk, referenced by path and SHA-256.
- **Android shell, test first:** phase 1 starts with a feasibility test on a real Android phone: in-app camera capture to private storage, a 60-second audio recording, Health Connect reads, and a background sync over the phone’s hotspot. If any of them fails or proves unreliable, switch the Android shell to a native Kotlin app (Jetpack Compose) that calls the same Rust core, and keep the desktop app unchanged. Decide within the first week.

Suggested layout: crates/hashi-core, crates/hashi-batch, crates/hashi-server, apps/desktop, apps/mobile, plugins/tauri-plugin-hashi-native.

## 4. Design system (taken from the prototypes)

- **Themes:** dark and light, following the system setting, with a manual override in Settings. Dark: background #0E0E10, sidebar #131316, cards #1A1A1E, dividers #2A2A2E, text #F5F5F5, muted #8A8A90. Light: background #F7F6F3, cards #FFFFFF, dividers #E6E4DF, text #18181B, muted #76767C.
- **One accent:** warm orange #FF5A1F. Used only for the primary action (Meal tile, “+ New entry”), the active nav item, and progress fills. Never a second accent colour.
- **Fonts:** Inter for text. JetBrains Mono only for times, durations and small numeric metadata.
- **Shape:** rounded corners 12 to 16 px, flat surfaces, no drop shadows, no blur, no glass, no gradients, no glow.
- **Copy:** sentence case, plain language. No all-caps labels, no “//” decoration, no technical words like latency, buffer, node, batch or telemetry on main screens.
- **Motion (important):** the owner wants some animation but only the useful kind. Allowed: button press scale-down (about 100 ms), hover background change (about 90 ms), expand/collapse of an entry (about 150 ms), capture screens sliding up (about 180 ms), a linear progress bar while recording, and a short fade on tab switch (120 ms at most). Not allowed: looping, bouncing, pulsing, parallax, page transitions longer than 200 ms, fake equalizer animation, anything that delays input. Never make the user wait for an animation to finish. Respect the system “reduce motion” setting by disabling all of the above.
- **Touch targets:** at least 44 px on mobile. One-handed reach: primary actions in the lower two thirds.
- **Empty states:** one short muted sentence, never illustrations.

## 5. Architecture

### 5.1 Pairing and discovery

- First-time pairing: the desktop shows a QR code (Settings). The phone scans it. The QR carries the PC’s device ID, a one-time pairing secret and a certificate fingerprint. After pairing, both sides remember each other.
- Discovery order: (1) mDNS service advertisement from the PC, (2) UDP broadcast on the hotspot subnet as fallback, (3) manual IP entry in phone Settings as last resort. Android hotspots can isolate clients or block multicast on some devices, so all three must exist.
- All traffic is encrypted and authenticated (TLS with the pinned certificate from pairing, or an equivalent signed scheme). Nothing is accepted from unpaired devices. The server only listens while the PC is on a private network and refuses public networks.

### 5.2 Sync protocol (transport only, zero AI)

- Triggered when the app is opened with a peer reachable, when the hotspot-connected laptop appears, by a periodic background job, or manually by tapping the sync status on the phone.
- Every syncable record has: a UUID, created\_at, updated\_at, device\_id, a dirty flag, a deleted\_at tombstone and a version counter.
- Each side sends records changed since the last confirmed sync cursor for each table. The other side applies them in one transaction and acknowledges.
- Media files are sent separately, resumable, and verified by SHA-256. Only after the PC confirms the file is safely written to its vault does it send an acknowledgement, and only then does the phone delete the raw photo or audio. The phone keeps a small thumbnail of each meal photo (about 200 px, roughly 15 KB, always on) and always keeps the text summaries.
- Direction of authority: raw captures originate on the phone; AI-generated fields (macros, summaries, structured bullets, reports) are authoritative on the PC and are pushed to the phone.
- Interrupted syncs must be safe to repeat (idempotent) and must never lose or duplicate data.

### 5.3 Conflict rules

- **Ideas (two-way editable):** if only one side edited since the last sync, copy it across, no AI. If both edited, mark the idea as “pending merge” and keep the base version, the phone draft and the PC draft. In the nightly batch, an LLM receives all three and returns one merged note that keeps every unique point from both. Store all three versions in an idea revision history. The merged note becomes active and syncs back.
- **Everything else:** latest updated\_at wins. Deletions use tombstones so a deleted item does not come back.
- **Private log:** append-only on the phone; edits only on the PC after unlock (see section 8).

### 5.4 Nightly batch (1:00 AM)

- Runs at 01:00 local time inside the desktop background process. If the PC was off or asleep, it runs as soon as possible after the next startup or next phone connection (catch-up).
- Work is queued per record in a job table with status (pending, running, done, failed, retry-after), attempt count and last error.
- Processing order: group pending items by their **original capture date**, oldest date first, so late-synced past days are finished before today. After each date is complete, update that day’s daily summary and totals.
- Per item: meal photo → vision analysis; voice note → transcription then bullet summary; idea → structuring (or conflict merge); weekly report → compiled on Sunday night for the week just ended.
- Throttle to one AI request every 3 seconds. On HTTP 429 or errors, use exponential backoff, then leave the job as retry-after for the next run. One failing item must never block the others.
- Resize meal photos on the PC before upload: longest edge 768 px, JPEG quality about 80. The original stays untouched in the vault.
- Results are written to the PC database and delivered to the phone at the next sync. A batch log (what ran, what failed) is viewable in desktop Settings.
- A “Run now” action exists in desktop Settings and the tray menu for testing or catching up manually. It is not a main-screen button.

## 6. Data model (described in words)

All tables carry the sync fields from 5.2.

- **Idea:** title (optional, auto-generated if blank), raw text, structured bullets, tags, status (raw, processed, merged, pending merge). **Idea revision:** idea ID, type (base, phone, PC, merged, edit), content, timestamp.
- **Voice journal entry:** recorded\_at, duration in seconds, audio file path (PC) and checksum, transcript, edited transcript, summary bullets (3 to 5), processing status. Phone stores only summary and transcript after sync.
- **Meal:** captured\_at, meal type (breakfast, lunch, dinner, snack), photo path (PC) and checksum, optional user note, optional manual calories, AI food items (each with name, estimated quantity, kcal, protein, carbs, fat), totals, confidence, user-edited flag, processing status.
- **Workout:** date/time, type (treadmill, strength, mobility, custom), duration, sets/reps/weight or incline/intensity where relevant, notes, source (manual or Health Connect), link to the matching duplicate if deduplicated.
- **Health daily metrics:** date, steps, distance, active calories, sleep total and stages, resting heart rate, average heart rate, source.
- **Habit:** name, schedule (daily by default), archived flag. **Habit check:** habit ID, date, done.
- **Book:** title, total pages (optional), status. **Reading log:** book ID, date, pages read, minutes read.
- **Private log entry (encrypted):** timestamp, trigger tag, optional place (coarse, optional), optional note.
- **Daily summary:** date, calorie and macro totals, short AI day recap (optional), counts of entries.
- **Weekly report:** week start, exercise analysis text, volume totals, consistency score, reading and habit consistency.
- **Settings:** daily calorie and macro targets, batch time, vault directory, provider choices, theme.
- **Job queue and sync cursor tables** as described above.

## 7. AI pipeline (all free tier)

Providers must be configurable in Settings so any one can be swapped without code changes. **Verify the exact model names, free-tier limits and data-use terms at build time**, because they change often; do not hardcode them.

- **Meal vision:** Google AI Studio (Gemini Flash family, free tier, no billing account linked). Send the resized photo plus the optional user note and meal type. Require strict JSON output matching a fixed schema: list of items with quantity and per-item calories/protein/carbs/fat, totals, and a confidence value. The prompt should know typical Indian home and restaurant food, prefer realistic portions, and use the user’s note as the strongest hint.
- **Voice journal:** Groq Whisper (whisper-large-v3-turbo class) for transcription, then a fast LLM for 3 to 5 short, faithful bullet takeaways. Do not invent content. Keep the owner’s own wording where possible.
- **Idea structuring:** LLM turns a ramble into a short title, clean bullet points and suggested tags, losing no thoughts and adding none.
- **Idea merge:** LLM receives base, phone draft and PC draft and returns one merged note preserving every unique point.
- **Weekly exercise report (Sunday night):** LLM receives that week’s workouts and Health Connect activity data and returns a short report: what was done, volume vs last week, progressive-overload notes, consistency, one suggestion for next week. Keep it factual and brief.
- **Fallbacks:** OpenRouter free models or Cloudflare Workers AI for text tasks if the primary provider is down or rate-limited.
- **Cost safety:** never attach a payment method to a key. Respect daily caps with a local counter. If a cap is reached, stop and resume next run.
- **Privacy decision:** free tiers of some providers may use submitted content to improve their products. Meal photos are low risk. The owner has accepted that meal photos, journal transcripts and ideas go to the free-tier providers above, so no extra privacy settings are needed beyond choosing the provider for each task. The private log is never sent anywhere.

## 8. Privacy and security

- The private log (the owner’s personal habit-tracking log, internally called Fatsame in his notes) lives in an encrypted SQLCipher database. The key is derived from a passphrase and stored in the Android Keystore or the OS keychain; on desktop unlock uses Windows Hello where available, otherwise a master passphrase.
- It is excluded from AI prompts, search indexes, daily summaries, weekly reports, notifications, backups to any cloud, and the Recent/timeline lists.
- UI label on screen is the neutral word **Private**. The screen blocks screenshots and hides content in the app switcher.
- Phone entry opens behind biometric or PIN each time. Desktop vault auto-locks after 5 minutes idle.
- Location, if used, is optional, coarse, user-editable and stored only in the encrypted table. Default is off.
- API keys are stored in the OS keychain, never in plain files or the repo.
- The LAN server accepts only paired devices over an authenticated, encrypted channel.
- Media in the vault is stored as normal files in a folder the owner can open, so nothing is locked inside the app.

## 9. Android app: every screen and control

Starts instantly to Home. Works fully offline. Bottom navigation with four items: Home, Ideas, Health, Journal. Active item uses the accent colour.

### 9.1 Home

- Header: greeting by time of day (Good morning/afternoon/evening) and a round profile button. Tapping the profile button opens a small sheet with sync status (items waiting, last sync time, whether the PC was found), a **Sync now** button, and a link to Settings.
- 2x2 tiles: **Meal** (accent filled), **Voice**, **Note**, **Habit**. Each shows only an icon and one word. Press feedback about 100 ms.
- One quiet line under the tiles: calories today, steps today, reading streak in days. Calories show a manual total or “pending” until the nightly result arrives.
- Recent: the last three entries as rows (type icon, one-line text, time). Tapping a row expands it in place to show the full text, macros or summary. Entries waiting for the nightly batch show a small muted “Waiting for tonight” hint.

### 9.2 Meal capture

- Opens an in-app camera viewfinder (CameraX). Controls: shutter, flash (auto/on/off), close.
- After the shot: preview, **Retake**, meal type chips (auto-selected by time of day, changeable), optional note field (example: “200g paneer, 2 rotis”), optional manual calories field, **Save**.
- The photo is written straight into the app’s private storage, never the phone gallery. Saved entries show as “Waiting for tonight” until synced and processed.

### 9.3 Voice journal recorder

- Full-screen. Large round record button, timer shown as elapsed over 0:30 with a linear progress bar. Tap to start, tap to stop.
- At 0:30 a clear **Keep going** option appears that extends the limit to the hard maximum of 1:00. Recording stops automatically at 1:00.
- After stopping: play back, **Discard**, **Save**. Save encodes a small Opus file (about 32 kbps) and queues it.
- This recording is only for the journal. No voice commands, no voice notes anywhere else.

### 9.4 Note (idea) composer

- Full-screen, distraction-free. Optional title, large text area, tag chips (suggested: dev, poetry, film, general, plus custom tags), **Save**. Saves instantly, no waiting.

### 9.5 Habit sheet (opened from the Habit tile)

A sheet with four segments:

- **Habits:** checklist for today with big tick boxes. Edit list (add, rename, reorder, archive).
- **Reading:** book selector (with **Add book**), pages read stepper with quick +5, +10, +25 buttons and manual entry, minutes read, **Log**.
- **Workout:** preset buttons (Treadmill, Strength, Mobility, Custom). Fields adapt: treadmill = duration, incline, speed; strength = exercise name, sets, reps, weight; mobility/custom = duration and notes. **Log workout**.
- **Private:** biometric/PIN gate, then a one-tap entry with trigger tag buttons (Boredom, Stress, Late night, Phone in bed, Other), automatic editable timestamp, optional place chip, optional note, **Save**. Nothing from this segment appears in any feed.

### 9.6 Ideas tab

- Search field and a horizontal tag filter strip. List of idea rows (title or first line, last edited time, small status: synced, edited here, merged).
- Tap to open the editor: editable text with bullet support, **Save**, **Delete** (with confirm), and a **History** view if the idea was merged. Editing marks the idea for sync.
- **+ New idea** floating button.

### 9.7 Health tab

- Calories card (from the nightly result), steps and sleep cards (from Health Connect), today’s habits list, reading progress for the active book, latest weekly exercise report (read-only text), and a **Refresh from Health Connect** button with a permission prompt on first use.
- Health Connect data to read: steps, distance, active calories burned, sleep sessions with stages, heart rate, resting heart rate, exercise sessions. Read-only. Deduplicate exercise sessions against manual workouts.

### 9.8 Journal tab

- Date switcher (previous/next day, tap date for a calendar). For each voice entry: time, duration, summary bullets, a collapsible full transcript. A muted note says the audio is stored on the PC. Entries not yet processed show “Summary arrives after tonight’s run”.

### 9.9 Mobile Settings

Pairing (scan QR, forget PC, manual IP), sync now, Health Connect permissions, default meal times, theme, app lock for Private, storage used, About. No API keys on the phone.

## 10. Desktop app: every screen and control

Tauri window with a fixed left sidebar (220 px), top bar and content area, matching Hashi\_Desktop.html. Runs in the system tray and keeps working when the window is closed. A single running instance only.

### 10.1 Global chrome

- **Sidebar:** Hashi wordmark; items **Today, Food, Ideas, Journal, Health, Private**; at the bottom a Settings item and a muted line “Next summary at 1:00 am”. A small muted indicator shows whether the phone is connected.
- **Top bar:** previous/next day arrows and a clickable date that opens a calendar picker with a **Today** jump; a search field (full-text across ideas, transcripts, meals, notes).
- **“+ New entry” button** at bottom right with a menu: Meal (upload a photo), Voice (record on PC or import an audio file), Note. New entries appear in place, no popups.
- Keyboard shortcuts: Ctrl+K search, arrow keys for previous/next day, Ctrl+N new entry.

### 10.2 Today

A one-glance view of the selected day:

- A summary sentence (for example “3 meals, 1 voice note, 2 ideas”).
- Four stat cards: calories (with one thin bar against target), steps, sleep, habits done (with streak).
- A single chronological timeline, one quiet line per entry (time, icon, short text, small detail). Clicking a line opens the full item in its own tab. No expanded cards on this screen.
- Past days load that day’s data from the vault.

### 10.3 Food

- Photos grouped by date (newest day first), each day heading showing the date and that day’s total calories. Within a day, ordered by time. Each tile: square photo, time, meal name, kcal.
- Clicking a tile opens the full detail in a side panel or in place: large photo, meal type, AI food items with per-item macros, totals, confidence. Actions: **Edit macros** (manual override, marks as user-edited), **Re-analyze** (with an optional hint; runs on the next batch or immediately if the owner chooses), **Change meal type**, **Delete** (with confirm), **Open in folder**.
- A compact 7-day calories and protein chart and macro totals against targets can sit above the grid or in Health, as flat bars, no rounded caps.

### 10.4 Ideas (two-way workspace)

- Left pane: filterable list (all, raw, processed, merged; tag filters) and **+ New idea**. Right pane: the editor with a toggle between the cleaned bullets and the original raw ramble. Edits auto-save locally and flag the idea for sync.
- **View merge** appears on merged notes and shows phone draft, PC draft and merged result side by side with **Restore this version**. Full revision history is kept.

### 10.5 Journal

- Entries grouped by date with exact times. Each entry: audio player (play/pause, back 5 s, forward 5 s, speed 1x/1.25x/1.5x, a scrubbable waveform/progress bar generated from the file, current time over total), 3 to 5 summary bullets, a collapsible full transcript with **Edit transcript**, and **Open in folder**.
- Pending entries show “Will be summarised tonight”. The waveform must be static when paused; no fake animation.

### 10.6 Health

- **Weekly exercise report** card (Sunday night result) with **Regenerate** (limited by daily caps).
- **Biometrics:** steps, sleep with stages, resting heart rate, active burn, shown as simple readouts with a 7-day trend.
- **Workout log:** table combining manual and Health Connect workouts, deduplicated, with **+ Log workout**.
- **Reading:** active books with page progress, **+ Add book**, and a GitHub-style consistency grid.
- **Habits:** daily checklist and streaks, with manage (add, rename, archive).

### 10.7 Private

- Locked by default. **Unlock** (Windows Hello/keyring or passphrase). Once open: timestamped entries, trigger breakdown, clean-day streak, **Edit/Delete** for entries, and an auto-lock countdown. Locks immediately on window minimise if the option is on. Content never appears in search, tray notifications or logs.

### 10.8 Settings

Pairing (QR code and connected devices), vault folder location and storage used, daily calorie and macro targets, batch time (default 01:00), **Run batch now**, **Sync now**, batch log and failed-job list with **Retry**, provider and API key fields (stored in the OS keychain) with a test button, per-provider daily usage counters, theme, start on login, backup (automatic nightly copy of the database to a second folder the owner picks, plus manual export of everything as a zip), About.

## 11. Notifications and edge cases

- Notifications are minimal and optional: “Last night’s summary is ready” on the phone after sync, and a reminder to take a meal photo is **off by default**. No notification ever mentions the private log.
- Phone storage low: warn in Settings, never silently drop captures.
- Duplicate Health Connect and manual workouts: deduplicate by time overlap and type, keep the manual entry’s notes.
- Clock or timezone changes: store timestamps in UTC plus the local offset at capture so Journal and Food show the original local time (IST).
- A capture made while the PC is off simply waits. A queue count is visible in the phone’s sync sheet.
- Deleting on one side propagates to the other, and media files are removed from the vault only after the owner confirms a delete on the PC.
- Database migrations must be versioned and non-destructive, with an automatic pre-migration backup.

## 12. Non-functional requirements

- Mobile cold start under one second to usable Home. Capturing a note should take under 3 seconds from app open.
- Desktop idle memory kept small; tray daemon idle should use almost no CPU.
- Small installers. No heavy ML libraries (no PyTorch, no local Whisper).
- Battery friendly: no constant polling; sync only on triggers listed in 5.2.
- Fully usable offline on both devices.
- Accessible: readable contrast, scalable text, labels on all icon buttons.
- Android permissions requested only when first needed: camera, microphone, Health Connect read permissions, local network access, notifications (optional), coarse location (optional).
- Logging to a local rotating file, with no content from the private log.
- Tests for the sync state machine, conflict rules, batch ordering/catch-up and encryption round-trips.

## 13. Build order for the agent

1. **Scaffold:** workspace, Tauri desktop and Android shells. Run the Android feasibility test from section 3 (camera, 60-second recording, Health Connect, background sync over the hotspot) and report the result. Then port both HTML prototypes into components with the real tab navigation and the design tokens, using fake data. Confirm they look identical to the prototypes.
2. **Core + local mobile capture:** hashi-core schema and migrations. Phone: notes, in-app meal camera, voice journal recorder, habits, reading, workouts all saved locally. Persist and reload correctly.
3. **Desktop reads real data:** desktop app opens the PC database and shows Today, Food, Ideas, Journal, Health from it. Add manual entry creation on PC.
4. **Pairing and sync:** QR pairing, discovery with fallbacks, delta sync, file transfer with checksums, ACK and purge, idea conflict flagging. Test with the hotspot setup.
5. **Nightly batch:** job queue, date-ordered catch-up, meal vision, journal transcription and summaries, idea structuring and merge, throttling and backoff, results delivered back to the phone.
6. **Health Connect + reports:** Kotlin plugin, daily metrics, dedupe, weekly exercise report.
7. **Private vault:** encryption, unlock flows, screenshot blocking, exclusion checks (verify nothing leaks into search, prompts or logs).
8. **Polish:** tray behaviour, backups, settings, empty states, reduced motion, performance pass.

## 14. Decisions already made

- Android shell: start with Tauri v2 and run the feasibility test from section 3 first. If it fails, switch to a native Kotlin app that calls the shared Rust core (not Flutter).
- AI privacy: the owner accepts that meal photos, journal transcripts and ideas go to the free-tier providers. The private log is still never sent anywhere.
- Meal thumbnails: yes, the phone keeps a small thumbnail of each meal after the original photo is purged.

