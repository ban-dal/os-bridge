#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "macos")]
pub use macos::{
  get_notification_interruption_level, get_permission_status, request_focus_status_authorization,
  request_notification_permission,
};

#[cfg(target_os = "windows")]
pub use windows::{get_notification_interruption_level, get_permission_status};

#[cfg(target_os = "windows")]
pub fn request_notification_permission(app_user_model_id: Option<String>) -> String {
  get_permission_status(app_user_model_id)
}

#[cfg(target_os = "windows")]
pub fn request_focus_status_authorization() -> String {
  "unsupported".to_string()
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn get_permission_status(_app_user_model_id: Option<String>) -> String {
  "unsupported".to_string()
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn get_notification_interruption_level() -> String {
  "unsupported".to_string()
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn request_notification_permission(_app_user_model_id: Option<String>) -> String {
  "unsupported".to_string()
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn request_focus_status_authorization() -> String {
  "unsupported".to_string()
}
