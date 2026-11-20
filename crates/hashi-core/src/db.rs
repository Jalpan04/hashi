use crate::error::CoreResult;
use crate::schema::{Migration, MIGRATIONS};
use chrono::Utc;
use rusqlite::{params, Connection};
use std::fs;
use std::path::{Path, PathBuf};

pub struct Database {
    pub(crate) conn: Connection,
    pub(crate) db_path: Option<PathBuf>,
    pub(crate) media_dir: PathBuf,
    pub(crate) device_id: String,
}

impl Database {
    pub fn open<P: AsRef<Path>, M: AsRef<Path>>(
        db_path: P,
        media_dir: M,
        device_id: impl Into<String>,
    ) -> CoreResult<Self> {
        let db_path = db_path.as_ref().to_path_buf();
        let media_dir = media_dir.as_ref().to_path_buf();

        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::create_dir_all(&media_dir)?;

        let existed_non_empty = db_path.exists()
            && fs::metadata(&db_path).map(|m| m.len() > 0).unwrap_or(false);

        let conn = Connection::open(&db_path)?;
        configure_pragmas(&conn)?;

        let mut db = Self {
            conn,
            db_path: Some(db_path),
            media_dir,
            device_id: device_id.into(),
        };

        db.run_migrations(MIGRATIONS, existed_non_empty)?;
        Ok(db)
    }

    pub fn open_in_memory<M: AsRef<Path>>(
        media_dir: M,
        device_id: impl Into<String>,
    ) -> CoreResult<Self> {
        let media_dir = media_dir.as_ref().to_path_buf();
        fs::create_dir_all(&media_dir)?;

        let conn = Connection::open_in_memory()?;
        configure_pragmas(&conn)?;

        let mut db = Self {
            conn,
            db_path: None,
            media_dir,
            device_id: device_id.into(),
        };

        db.run_migrations(MIGRATIONS, false)?;
        Ok(db)
    }

    pub fn device_id(&self) -> &str {
        &self.device_id
    }

    pub fn media_dir(&self) -> &Path {
        &self.media_dir
    }

    pub fn db_path(&self) -> Option<&Path> {
        self.db_path.as_deref()
    }

    pub fn schema_version(&self) -> CoreResult<u32> {
        let version: Option<u32> = self.conn.query_row(
            "SELECT MAX(version) FROM schema_migrations",
            [],
            |row| row.get(0),
        )?;
        Ok(version.unwrap_or(0))
    }

    pub fn run_migrations(
        &mut self,
        migrations: &[Migration],
        existed_non_empty: bool,
    ) -> CoreResult<Option<PathBuf>> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL
            );",
        )?;

        let current_version = self.schema_version()?;
        let pending: Vec<&Migration> = migrations
            .iter()
            .filter(|m| m.version > current_version)
            .collect();

        if pending.is_empty() {
            return Ok(None);
        }

        // Automatic pre-migration backup when upgrading an existing database file
        let mut backup_path = None;
        if let Some(ref path) = self.db_path {
            if existed_non_empty || current_version > 0 {
                // Flush WAL before copying so the backup is self-contained
                let _ = self.conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
                let ts = Utc::now().format("%Y%m%dT%H%M%SZ");
                let file_name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("hashi.db");
                let backup_file = path.with_file_name(format!(
                    "{}.pre_v{}_{}.bak",
                    file_name, current_version, ts
                ));
                fs::copy(path, &backup_file)?;
                backup_path = Some(backup_file);
            }
        }

        for migration in pending {
            let tx = self.conn.transaction()?;
            tx.execute_batch(migration.sql)?;
            tx.execute(
                "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?1, ?2, ?3)",
                params![migration.version, migration.name, Utc::now().to_rfc3339()],
            )?;
            tx.commit()?;
        }

        Ok(backup_path)
    }
}

fn configure_pragmas(conn: &Connection) -> CoreResult<()> {
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;",
    )?;
    Ok(())
}
