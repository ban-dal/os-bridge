#![deny(clippy::all)]

use napi_derive::napi;

mod features;

#[napi(string_enum = "kebab-case")]
pub enum NotificationPermissionStatus {
  Granted,
  Denied,
  NotDetermined,
  Limited,
  Unsupported,
  Unknown,
}

impl From<String> for NotificationPermissionStatus {
  fn from(status: String) -> Self {
    match status.as_str() {
      "granted" => Self::Granted,
      "denied" => Self::Denied,
      "not-determined" => Self::NotDetermined,
      "limited" => Self::Limited,
      "unsupported" => Self::Unsupported,
      _ => Self::Unknown,
    }
  }
}

#[napi(js_name = "getPermissionStatus")]
pub fn get_permission_status(app_user_model_id: Option<String>) -> NotificationPermissionStatus {
  features::notification_permission::get_permission_status(app_user_model_id).into()
}
