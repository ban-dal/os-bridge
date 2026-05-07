mod platform;

pub fn get_permission_status(app_user_model_id: Option<String>) -> String {
  platform::get_permission_status(app_user_model_id)
}
