pub struct LanServer {
    pub port: u16,
    pub is_listening: bool,
}

impl LanServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            is_listening: false,
        }
    }

    pub fn start(&mut self) -> Result<(), String> {
        self.is_listening = true;
        Ok(())
    }

    pub fn stop(&mut self) {
        self.is_listening = false;
    }
}
