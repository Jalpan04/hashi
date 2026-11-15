# Hashi Architecture Decisions & Assumptions (DECISIONS.md)

This document records architectural decisions, assumptions, and feasibility assessment findings made during implementation, per Section 0 and Section 14 of the project specification.

---

## 1. Phase 1 Android Feasibility Assessment

As required by Section 3 and Section 13 (Step 1), a feasibility assessment of the 4 Android core capabilities was conducted:

1. **In-app CameraX capture straight into private app storage:**
   - *Requirement:* Must save photos directly to private internal storage (`context.filesDir`) with zero gallery leakage, custom flash control, and immediate preview.
   - *Feasibility:* Standard WebView file-picker prompts (`<input type="file" capture>`) leak to system temporary media stores or system camera intents. Direct CameraX streaming (`androidx.camera:camera-camera2`, `camera-lifecycle`, `camera-view`) via Tauri v2 Android plugin (`tauri-plugin-hashi-native`) or native Activity is necessary and feasible.
   - *Decision:* Scaffolded `plugins/tauri-plugin-hashi-native` with Kotlin CameraX controller contract. The web layer provides a camera viewfinder UI that hooks into the plugin on Android and provides an HTML5 fallback in desktop/browser previews.

2. **60-second voice recording (Opus 32kbps container directly to disk):**
   - *Requirement:* Elapsed timer up to 0:30, "Keep going" extension to hard limit of 1:00, saving a lightweight Opus file directly into private app storage.
   - *Feasibility:* WebView `MediaRecorder` with `audio/webm;codecs=opus` works on modern Android WebViews. However, background interruptions (calls, screen off) can terminate recording prematurely. Native Android `MediaRecorder` or `AudioRecord` via plugin provides uninterrupted recording and writes straight to private files.
   - *Decision:* Implement Web Audio / MediaRecorder as standard client layer, backed by native plugin hooks for native private file persistence.

3. **Android Health Connect reads:**
   - *Requirement:* Read steps, distance, active calories burned, sleep sessions with stages, resting heart rate, average heart rate, and exercise sessions.
   - *Feasibility:* Health Connect (`androidx.health.connect:connect-client`) is strictly an Android Jetpack API requiring Android permission contracts (`HealthPermission`). It has no browser or WebView JavaScript bindings.
   - *Decision:* Fully specified in `plugins/tauri-plugin-hashi-native` Kotlin bridge. For development and Phase 1 fake data, a mock service layer provides sample biometric metrics matching the exact specification schema.

4. **Background sync over phone hotspot:**
   - *Requirement:* Synchronize captures when connected to PC on the hotspot subnet, even when app is closed or backgrounded.
   - *Feasibility:* Android OS suspends WebView processes when the app is backgrounded. Background sync requires Android `WorkManager` (`androidx.work:work-runtime-ktx`) configured with network constraints (`NetworkType.CONNECTED` or `UNMETERED`).
   - *Decision:* Android background sync is wired to `WorkManager` in the native plugin, while foreground sync is driven by the Rust core state machine.

*Feasibility Conclusion:* Tauri v2 with a custom Kotlin plugin (`tauri-plugin-hashi-native`) satisfies all requirements. If Android compilation environment lacks Google Play Services or Health Connect during packaging, the architecture cleanly isolates the Rust core so switching to a native Jetpack Compose shell (Section 14) would require zero changes to `hashi-core`, `hashi-server`, or the desktop app.

---

## 2. Frontend Framework & Porting Fidelity

- **Choice:** TypeScript + Vite with native web components and plain CSS variables.
- **Rationale:** Section 3 specifies: "SolidJS or vanilla TypeScript with plain CSS variables (Tailwind optional). Match the prototypes. No heavy UI libraries." Single-bundle TypeScript preserves the exact CSS tokens (`--bg`, `--card`, `--line`, `--tx`, `--mu`, `--ac`, `--on`, `--hv`), exact SVG paths, 100ms button scale-down, 90ms hover transitions, and sub-second cold starts.
- **Prototypes as Source of Truth:** All markup, classes, CSS variables, and layout structures from `Hashi.html` and `Hashi_Desktop.html` are preserved 1:1.

---

## 3. Scope & Unimplemented Screens Design Consistency

Per Section 0: "Screens and controls described in this document that the prototypes do not show (Settings, the camera viewfinder, pairing, the Private unlock flow) must be built in the same visual style."

1. **Desktop Settings:**
   - Styled with standard cards (`.card`, `.lbl`, `.two`, `.row2`).
   - Includes QR code display for pairing, vault storage path, daily targets, batch time (01:00), Run Batch Now, Sync Now, API keys in OS keychain, backup folder, and dark/light theme toggle.
2. **Desktop Private Log:**
   - Protected by an unlock gate with PIN / master passphrase.
   - Shows clean-day streak, trigger tag breakdown, encrypted entries list, and auto-lock countdown timer.
3. **Mobile Sync & Settings Sheet:**
   - Tapping the header avatar opens a bottom sheet showing hotspot sync status, pending items count, PC discovery indicator, manual sync trigger, and navigation to Settings.
4. **Mobile Camera Viewfinder:**
   - Custom in-app camera viewfinder with dark overlay, flash control (Auto, On, Off), shutter button, image preview, retake button, meal type selector chips, and optional notes/calories fields.
5. **Mobile Voice Journal Extended Recording:**
   - 0:30 default limit with "Keep going" button unlocking up to 1:00 max, linear progress bar, audio playback scrubber, and discard/save actions.
6. **Mobile Habit Sheet Segments:**
   - 4 segments: Habits checklist, Reading progress (with +5, +10, +25 steppers), Workout logger (with dynamic fields for Treadmill, Strength, Mobility, Custom), and Private entry (biometric/PIN unlock, trigger tag buttons, location, note).

---

## 4. No Extra Features Assumption

- No cloud servers, no analytics, no social sharing, no external fonts other than Inter and JetBrains Mono.
- Single accent color: `#FF5A1F` exclusively.
- Sentence case copy throughout.
