use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

pub fn get_permission_status(app_user_model_id: Option<String>) -> String {
  let Some(app_id) = app_user_model_id.filter(|value| !value.trim().is_empty()) else {
    return "unknown".to_string();
  };

  read_registry_setting(&app_id).unwrap_or_else(|| "unknown".to_string())
}

fn read_registry_setting(app_id: &str) -> Option<String> {
  let current_user = RegKey::predef(HKEY_CURRENT_USER);
  let key_path = format!(
    r"Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\{}",
    app_id
  );
  let key = current_user.open_subkey(key_path).ok()?;
  let enabled = key.get_value::<u32, _>("Enabled").ok();

  // Windows omits this value for the default allowed state.
  Some(
    match enabled {
      Some(0) => "denied",
      Some(_) => "granted",
      None => "granted",
    }
    .to_string(),
  )
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn returns_unknown_without_app_id() {
    assert_eq!(get_permission_status(None), "unknown");
    assert_eq!(get_permission_status(Some(" ".to_string())), "unknown");
  }
}
