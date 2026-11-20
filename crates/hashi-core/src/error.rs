use thiserror::Error;

#[derive(Debug, Error)]
pub enum CoreError {
    #[error("database error: {0}")]
    Sql(#[from] rusqlite::Error),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("record not found: {0}")]
    NotFound(String),

    #[error("validation error: {0}")]
    Validation(String),
}

pub type CoreResult<T> = Result<T, CoreError>;
