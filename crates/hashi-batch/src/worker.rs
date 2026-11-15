#[derive(Debug, Clone)]
pub struct BatchRunReport {
    pub started_at: String,
    pub completed_at: Option<String>,
    pub items_processed: u32,
    pub items_failed: u32,
    pub errors: Vec<String>,
}

pub struct BatchWorker {
    pub is_running: bool,
}

impl BatchWorker {
    pub fn new() -> Self {
        Self { is_running: false }
    }

    pub fn run_nightly_batch(&mut self) -> BatchRunReport {
        self.is_running = true;
        let report = BatchRunReport {
            started_at: "2026-11-16T01:00:00Z".to_string(),
            completed_at: Some("2026-11-16T01:00:05Z".to_string()),
            items_processed: 0,
            items_failed: 0,
            errors: Vec::new(),
        };
        self.is_running = false;
        report
    }
}
