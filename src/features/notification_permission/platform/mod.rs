#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "macos")]
pub use macos::get_permission_status;

#[cfg(target_os = "windows")]
pub use windows::get_permission_status;

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn get_permission_status(_app_user_model_id: Option<String>) -> String {
  "unsupported".to_string()
}
