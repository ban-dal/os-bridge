use std::io::ErrorKind;
use windows::UI::Notifications::{ToastNotificationManager, ToastNotificationMode};
use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

pub fn get_permission_status(app_user_model_id: Option<String>) -> String {
  let Some(app_id) = app_user_model_id.filter(|value| !value.trim().is_empty()) else {
    return "unknown".to_string();
  };

  read_registry_setting(&app_id).unwrap_or_else(|| "unknown".to_string())
}

pub fn get_notification_interruption_level() -> String {
  read_toast_notification_mode_level().unwrap_or_else(|| "unknown".to_string())
}

fn read_registry_setting(app_id: &str) -> Option<String> {
  let current_user = RegKey::predef(HKEY_CURRENT_USER);
  let key_path = format!(
    r"Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\{}",
    app_id
  );
  let key = match current_user.open_subkey(key_path) {
    Ok(key) => key,
    Err(error) if error.kind() == ErrorKind::NotFound => return Some("granted".to_string()),
    Err(_) => return None,
  };
  let enabled = key.get_value::<u32, _>("Enabled").ok();

  // Windows omits this value for the default allowed state.
  Some(permission_from_enabled_value(enabled).to_string())
}

fn permission_from_enabled_value(enabled: Option<u32>) -> &'static str {
  match enabled {
    Some(0) => "denied",
    Some(_) => "granted",
    None => "granted",
  }
}

fn read_toast_notification_mode_level() -> Option<String> {
  let manager = ToastNotificationManager::GetDefault().ok()?;
  let mode = manager.NotificationMode().ok()?;

  Some(interruption_level_from_toast_notification_mode(mode)?.to_string())
}

fn interruption_level_from_toast_notification_mode(
  mode: ToastNotificationMode,
) -> Option<&'static str> {
  match mode {
    ToastNotificationMode::Unrestricted => Some("normal"),
    ToastNotificationMode::PriorityOnly | ToastNotificationMode::AlarmsOnly => Some("limited"),
    _ => None,
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn returns_unknown_without_app_id() {
    assert_eq!(get_permission_status(None), "unknown");
    assert_eq!(get_permission_status(Some(" ".to_string())), "unknown");
  }

  #[test]
  fn treats_missing_enabled_value_as_granted() {
    assert_eq!(permission_from_enabled_value(None), "granted");
  }

  #[test]
  fn maps_enabled_registry_value_to_permission() {
    assert_eq!(permission_from_enabled_value(Some(0)), "denied");
    assert_eq!(permission_from_enabled_value(Some(1)), "granted");
  }

  #[test]
  fn maps_toast_notification_mode_to_interruption_level() {
    assert_eq!(
      interruption_level_from_toast_notification_mode(ToastNotificationMode::Unrestricted),
      Some("normal")
    );
    assert_eq!(
      interruption_level_from_toast_notification_mode(ToastNotificationMode::PriorityOnly),
      Some("limited")
    );
    assert_eq!(
      interruption_level_from_toast_notification_mode(ToastNotificationMode::AlarmsOnly),
      Some("limited")
    );
    assert_eq!(
      interruption_level_from_toast_notification_mode(ToastNotificationMode(3)),
      None
    );
  }
}
