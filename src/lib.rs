#![deny(clippy::all)]

use napi_derive::napi;

mod features;

#[derive(Clone, Debug, PartialEq, Eq)]
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

#[derive(Clone, Debug, PartialEq, Eq)]
#[napi(string_enum = "kebab-case")]
pub enum NotificationInterruptionLevel {
  Normal,
  Limited,
  Unsupported,
  Unknown,
}

impl From<String> for NotificationInterruptionLevel {
  fn from(status: String) -> Self {
    match status.as_str() {
      "normal" => Self::Normal,
      "limited" => Self::Limited,
      "unsupported" => Self::Unsupported,
      _ => Self::Unknown,
    }
  }
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[napi(string_enum = "kebab-case")]
pub enum NotificationUnavailableReason {
  PermissionDenied,
  PermissionNotDetermined,
  MissingAppUserModelId,
  InvalidAppUserModelId,
  UnsupportedPlatform,
  Unknown,
}

#[napi(object)]
pub struct NotificationDiagnosticsOptions {
  pub app_user_model_id: Option<String>,
  pub platform: Option<String>,
  pub request_focus_authorization: Option<bool>,
}

#[napi(object)]
pub struct NotificationCapability {
  pub can_notify: bool,
  pub permission: NotificationPermissionStatus,
  pub interruption_level: NotificationInterruptionLevel,
  pub reasons: Vec<NotificationUnavailableReason>,
}

#[napi(js_name = "getPermissionStatus")]
pub fn get_permission_status(app_user_model_id: Option<String>) -> NotificationPermissionStatus {
  features::notification_permission::get_permission_status(app_user_model_id).into()
}

#[napi(js_name = "getNotificationPermissionStatus")]
pub fn get_notification_permission_status(
  options: Option<NotificationDiagnosticsOptions>,
) -> NotificationPermissionStatus {
  let app_user_model_id = options.and_then(|value| value.app_user_model_id);

  get_permission_status(app_user_model_id)
}

#[napi(js_name = "requestMacNotificationPermission")]
pub fn request_mac_notification_permission(
  options: Option<NotificationDiagnosticsOptions>,
) -> NotificationPermissionStatus {
  let platform = resolve_platform(options.as_ref());

  if !is_supported_notification_platform(&platform) {
    NotificationPermissionStatus::Unsupported
  } else if platform == current_platform() {
    features::notification_permission::request_notification_permission(
      options.and_then(|value| value.app_user_model_id),
    )
    .into()
  } else {
    NotificationPermissionStatus::Unknown
  }
}

#[napi(js_name = "getNotificationInterruptionLevel")]
pub fn get_notification_interruption_level(
  options: Option<NotificationDiagnosticsOptions>,
) -> NotificationInterruptionLevel {
  let platform = resolve_platform(options.as_ref());

  if !is_supported_notification_platform(&platform) {
    NotificationInterruptionLevel::Unsupported
  } else if platform == current_platform() {
    features::notification_permission::get_notification_interruption_level(
      options
        .as_ref()
        .and_then(|value| value.request_focus_authorization)
        .unwrap_or(false),
    )
    .into()
  } else {
    NotificationInterruptionLevel::Unknown
  }
}

#[napi(js_name = "getNotificationCapability")]
pub fn get_notification_capability(
  options: Option<NotificationDiagnosticsOptions>,
) -> NotificationCapability {
  let platform = resolve_platform(options.as_ref());
  let permission = get_permission_status(
    options
      .as_ref()
      .and_then(|value| value.app_user_model_id.clone()),
  );
  let interruption_level = get_notification_interruption_level(options.clone());

  resolve_notification_capability(options.as_ref(), platform, permission, interruption_level)
}

impl Clone for NotificationDiagnosticsOptions {
  fn clone(&self) -> Self {
    Self {
      app_user_model_id: self.app_user_model_id.clone(),
      platform: self.platform.clone(),
      request_focus_authorization: self.request_focus_authorization,
    }
  }
}

fn resolve_notification_capability(
  options: Option<&NotificationDiagnosticsOptions>,
  platform: String,
  permission: NotificationPermissionStatus,
  interruption_level: NotificationInterruptionLevel,
) -> NotificationCapability {
  let mut reasons = Vec::new();

  if !is_supported_notification_platform(&platform) {
    add_reason(
      &mut reasons,
      NotificationUnavailableReason::UnsupportedPlatform,
    );
  }

  match permission {
    NotificationPermissionStatus::Denied => {
      add_reason(
        &mut reasons,
        NotificationUnavailableReason::PermissionDenied,
      );
    }
    NotificationPermissionStatus::NotDetermined => {
      add_reason(
        &mut reasons,
        NotificationUnavailableReason::PermissionNotDetermined,
      );
    }
    NotificationPermissionStatus::Unsupported => {
      add_reason(
        &mut reasons,
        NotificationUnavailableReason::UnsupportedPlatform,
      );
    }
    NotificationPermissionStatus::Unknown => {
      add_reason(&mut reasons, NotificationUnavailableReason::Unknown);
    }
    NotificationPermissionStatus::Granted | NotificationPermissionStatus::Limited => {}
  }

  if platform == "win32" {
    let app_user_model_id = options.and_then(|value| value.app_user_model_id.as_deref());

    if is_missing_app_user_model_id(app_user_model_id) {
      add_reason(
        &mut reasons,
        NotificationUnavailableReason::MissingAppUserModelId,
      );
    } else if is_invalid_app_user_model_id(app_user_model_id.unwrap_or_default()) {
      add_reason(
        &mut reasons,
        NotificationUnavailableReason::InvalidAppUserModelId,
      );
    }
  }

  NotificationCapability {
    can_notify: reasons.is_empty(),
    permission,
    interruption_level,
    reasons,
  }
}

fn add_reason(
  reasons: &mut Vec<NotificationUnavailableReason>,
  reason: NotificationUnavailableReason,
) {
  if !reasons.contains(&reason) {
    reasons.push(reason);
  }
}

fn resolve_platform(options: Option<&NotificationDiagnosticsOptions>) -> String {
  options
    .and_then(|value| value.platform.clone())
    .unwrap_or_else(current_platform)
}

fn current_platform() -> String {
  #[cfg(target_os = "macos")]
  {
    "darwin".to_string()
  }

  #[cfg(target_os = "windows")]
  {
    "win32".to_string()
  }

  #[cfg(target_os = "linux")]
  {
    "linux".to_string()
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
  {
    "unsupported".to_string()
  }
}

fn is_supported_notification_platform(platform: &str) -> bool {
  matches!(platform, "darwin" | "win32")
}

fn is_missing_app_user_model_id(app_user_model_id: Option<&str>) -> bool {
  app_user_model_id
    .map(|value| value.trim().is_empty())
    .unwrap_or(true)
}

fn is_invalid_app_user_model_id(app_user_model_id: &str) -> bool {
  app_user_model_id.len() > 128
    || app_user_model_id
      .chars()
      .any(|value| value == '\\' || value == '/' || value.is_control())
}

#[cfg(test)]
mod tests {
  use super::*;

  fn resolve(
    permission: NotificationPermissionStatus,
    interruption_level: NotificationInterruptionLevel,
  ) -> NotificationCapability {
    resolve_notification_capability(None, "darwin".to_string(), permission, interruption_level)
  }

  #[test]
  fn resolves_capability_by_permission_status() {
    let granted = resolve(
      NotificationPermissionStatus::Granted,
      NotificationInterruptionLevel::Normal,
    );
    assert!(granted.can_notify);
    assert_eq!(granted.reasons, Vec::<NotificationUnavailableReason>::new());

    let limited = resolve(
      NotificationPermissionStatus::Limited,
      NotificationInterruptionLevel::Normal,
    );
    assert!(limited.can_notify);
    assert_eq!(limited.reasons, Vec::<NotificationUnavailableReason>::new());

    let denied = resolve(
      NotificationPermissionStatus::Denied,
      NotificationInterruptionLevel::Normal,
    );
    assert!(!denied.can_notify);
    assert_eq!(
      denied.reasons,
      vec![NotificationUnavailableReason::PermissionDenied]
    );

    let not_determined = resolve(
      NotificationPermissionStatus::NotDetermined,
      NotificationInterruptionLevel::Normal,
    );
    assert!(!not_determined.can_notify);
    assert_eq!(
      not_determined.reasons,
      vec![NotificationUnavailableReason::PermissionNotDetermined]
    );
  }

  #[test]
  fn does_not_treat_limited_interruption_as_unavailable() {
    let capability = resolve(
      NotificationPermissionStatus::Granted,
      NotificationInterruptionLevel::Limited,
    );

    assert!(capability.can_notify);
    assert_eq!(
      capability.reasons,
      Vec::<NotificationUnavailableReason>::new()
    );
  }

  #[test]
  fn resolves_unsupported_platform_fallback() {
    let capability = resolve_notification_capability(
      None,
      "linux".to_string(),
      NotificationPermissionStatus::Unsupported,
      NotificationInterruptionLevel::Unsupported,
    );

    assert!(!capability.can_notify);
    assert_eq!(
      capability.reasons,
      vec![NotificationUnavailableReason::UnsupportedPlatform]
    );
  }

  #[test]
  fn resolves_multiple_unavailable_reasons() {
    let capability = resolve_notification_capability(
      None,
      "win32".to_string(),
      NotificationPermissionStatus::Denied,
      NotificationInterruptionLevel::Limited,
    );

    assert!(!capability.can_notify);
    assert_eq!(
      capability.reasons,
      vec![
        NotificationUnavailableReason::PermissionDenied,
        NotificationUnavailableReason::MissingAppUserModelId,
      ]
    );
  }
}
