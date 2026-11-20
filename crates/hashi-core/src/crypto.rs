use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevicePairingPayload {
    pub device_id: String,
    pub one_time_secret: String,
    pub certificate_fingerprint: String,
}

impl DevicePairingPayload {
    pub fn new(device_id: String, one_time_secret: String, certificate_fingerprint: String) -> Self {
        Self {
            device_id,
            one_time_secret,
            certificate_fingerprint,
        }
    }
}
