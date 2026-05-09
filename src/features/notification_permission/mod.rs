mod platform;

pub fn get_permission_status(app_user_model_id: Option<String>) -> String {
  platform::get_permission_status(app_user_model_id)
}

pub fn get_notification_interruption_level() -> String {
  platform::get_notification_interruption_level()
}

pub fn request_notification_permission(app_user_model_id: Option<String>) -> String {
  platform::request_notification_permission(app_user_model_id)
}

pub fn request_focus_status_authorization() -> String {
  platform::request_focus_status_authorization()
}
