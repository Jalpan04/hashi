use crate::error::CoreResult;
use crate::models::StorageStats;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct SavedMedia {
    pub relative_path: String,
    pub full_path: PathBuf,
    pub sha256: String,
    pub size_bytes: u64,
}

pub fn compute_sha256(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

pub fn save_media_file(
    media_root: &Path,
    subdir: &str,
    id: &str,
    ext: &str,
    bytes: &[u8],
) -> CoreResult<SavedMedia> {
    let dir = media_root.join(subdir);
    fs::create_dir_all(&dir)?;

    let clean_ext = ext.trim_start_matches('.');
    let file_name = format!("{}.{}", id, clean_ext);
    let full_path = dir.join(&file_name);
    let tmp_path = dir.join(format!("{}.{}.tmp", id, clean_ext));

    let sha256 = compute_sha256(bytes);

    fs::write(&tmp_path, bytes)?;
    fs::rename(&tmp_path, &full_path)?;

    let relative_path = format!("{}/{}", subdir, file_name);
    Ok(SavedMedia {
        relative_path,
        full_path,
        sha256,
        size_bytes: bytes.len() as u64,
    })
}

pub fn verify_file_checksum(path: &Path, expected_sha256: &str) -> CoreResult<bool> {
    let bytes = fs::read(path)?;
    Ok(compute_sha256(&bytes).eq_ignore_ascii_case(expected_sha256))
}

pub fn compute_storage_stats(db_path: Option<&Path>, media_root: &Path) -> CoreResult<StorageStats> {
    let db_bytes = match db_path {
        Some(p) if p.exists() => fs::metadata(p)?.len(),
        _ => 0,
    };

    let (meal_bytes, meal_count) = dir_size_and_count(&media_root.join("meals"))?;
    let (audio_bytes, audio_count) = dir_size_and_count(&media_root.join("audio"))?;

    Ok(StorageStats {
        db_bytes,
        media_bytes: meal_bytes + audio_bytes,
        meal_photo_count: meal_count,
        audio_file_count: audio_count,
    })
}

fn dir_size_and_count(dir: &Path) -> CoreResult<(u64, u32)> {
    if !dir.exists() {
        return Ok((0, 0));
    }
    let mut bytes = 0u64;
    let mut count = 0u32;
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let meta = entry.metadata()?;
        if meta.is_file() {
            bytes += meta.len();
            count += 1;
        }
    }
    Ok((bytes, count))
}
