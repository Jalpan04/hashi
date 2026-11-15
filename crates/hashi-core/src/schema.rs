pub const SCHEMA_V1: &str = r#"
CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    device_id TEXT NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    title TEXT,
    raw_text TEXT NOT NULL,
    structured_bullets TEXT,
    tags TEXT,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idea_revisions (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL,
    rev_type TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(idea_id) REFERENCES ideas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS voice_journal_entries (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    device_id TEXT NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    recorded_at TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    audio_file_path TEXT,
    audio_sha256 TEXT,
    transcript TEXT,
    edited_transcript TEXT,
    summary_bullets TEXT,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    device_id TEXT NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    captured_at TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    photo_path TEXT,
    photo_sha256 TEXT,
    thumbnail_b64 TEXT,
    user_note TEXT,
    manual_calories INTEGER,
    food_items TEXT,
    total_kcal INTEGER NOT NULL DEFAULT 0,
    total_protein REAL NOT NULL DEFAULT 0.0,
    total_carbs REAL NOT NULL DEFAULT 0.0,
    total_fat REAL NOT NULL DEFAULT 0.0,
    confidence REAL,
    user_edited INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    device_id TEXT NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    timestamp TEXT NOT NULL,
    workout_type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    notes TEXT,
    source TEXT NOT NULL,
    duplicate_link_id TEXT
);

CREATE TABLE IF NOT EXISTS health_daily_metrics (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    device_id TEXT NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    date TEXT NOT NULL UNIQUE,
    steps INTEGER NOT NULL DEFAULT 0,
    distance_meters REAL NOT NULL DEFAULT 0.0,
    active_calories INTEGER NOT NULL DEFAULT 0,
    sleep_minutes_total INTEGER NOT NULL DEFAULT 0,
    sleep_stages_json TEXT,
    resting_heart_rate INTEGER,
    average_heart_rate INTEGER,
    source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    device_id TEXT NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    schedule TEXT NOT NULL DEFAULT 'daily',
    archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS habit_checks (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    device_id TEXT NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    habit_id TEXT NOT NULL,
    date TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    UNIQUE(habit_id, date)
);

CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    device_id TEXT NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    total_pages INTEGER,
    status TEXT NOT NULL DEFAULT 'reading'
);

CREATE TABLE IF NOT EXISTS reading_logs (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    device_id TEXT NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    book_id TEXT NOT NULL,
    date TEXT NOT NULL,
    pages_read INTEGER NOT NULL DEFAULT 0,
    minutes_read INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_summaries (
    date TEXT PRIMARY KEY,
    total_calories INTEGER NOT NULL DEFAULT 0,
    total_protein REAL NOT NULL DEFAULT 0.0,
    total_carbs REAL NOT NULL DEFAULT 0.0,
    total_fat REAL NOT NULL DEFAULT 0.0,
    recap_text TEXT,
    entry_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS weekly_reports (
    week_start_date TEXT PRIMARY KEY,
    exercise_analysis TEXT NOT NULL,
    volume_totals TEXT NOT NULL,
    consistency_score REAL NOT NULL,
    reading_consistency REAL NOT NULL,
    habit_consistency REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_cursors (
    table_name TEXT PRIMARY KEY,
    last_synced_at TEXT NOT NULL,
    last_version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS batch_jobs (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    record_type TEXT NOT NULL,
    capture_date TEXT NOT NULL,
    status TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    retry_after TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"#;

pub const SQLCIPHER_PRIVATE_SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS private_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    trigger_tag TEXT NOT NULL,
    place TEXT,
    note TEXT
);
"#;
