use std::ffi::CString;
use std::sync::mpsc;
use std::time::Duration;

use block::ConcreteBlock;
use objc::runtime::{Class, Object, BOOL, YES};
use objc::{class, msg_send, sel, sel_impl};

const STATUS_NOT_DETERMINED: i64 = 0;
const STATUS_DENIED: i64 = 1;
const STATUS_AUTHORIZED: i64 = 2;
const STATUS_PROVISIONAL: i64 = 3;
const STATUS_EPHEMERAL: i64 = 4;
const FOCUS_STATUS_AUTHORIZED: i64 = 3;

#[link(name = "Intents", kind = "framework")]
extern "C" {}

#[link(name = "UserNotifications", kind = "framework")]
extern "C" {}

pub fn get_permission_status(_app_user_model_id: Option<String>) -> String {
  if !is_app_bundle() {
    return "unknown".to_string();
  }

  read_notification_settings().unwrap_or_else(|| "unknown".to_string())
}

pub fn get_notification_interruption_level(request_focus_authorization: bool) -> String {
  read_focus_status(request_focus_authorization).unwrap_or_else(|| "unknown".to_string())
}

pub fn request_notification_permission(_app_user_model_id: Option<String>) -> String {
  if !is_app_bundle() {
    return "unknown".to_string();
  }

  request_user_notification_authorization().unwrap_or_else(|| "unknown".to_string())
}

fn is_app_bundle() -> bool {
  unsafe {
    let bundle: *mut Object = msg_send![class!(NSBundle), mainBundle];
    let bundle_path: *mut Object = msg_send![bundle, bundlePath];
    let path_extension: *mut Object = msg_send![bundle_path, pathExtension];
    let app_extension = ns_string("app");
    let is_app: BOOL = msg_send![path_extension, isEqualToString: app_extension];

    is_app == YES
  }
}

fn request_user_notification_authorization() -> Option<String> {
  let (sender, receiver) = mpsc::channel();

  unsafe {
    let center: *mut Object =
      msg_send![class!(UNUserNotificationCenter), currentNotificationCenter];

    let block = ConcreteBlock::new(move |_granted: BOOL, _error: *mut Object| {
      let _ = sender.send(());
    })
    .copy();

    let options: u64 = (1 << 0) | (1 << 1) | (1 << 2);
    let _: () =
      msg_send![center, requestAuthorizationWithOptions: options completionHandler: &*block];

    receiver.recv_timeout(Duration::from_secs(30)).ok()?;
  }

  read_notification_settings()
}

fn read_notification_settings() -> Option<String> {
  let (sender, receiver) = mpsc::channel();

  unsafe {
    let center: *mut Object =
      msg_send![class!(UNUserNotificationCenter), currentNotificationCenter];

    let block = ConcreteBlock::new(move |settings: *mut Object| {
      let status = authorization_status(settings);
      let _ = sender.send(status);
    })
    .copy();

    let _: () = msg_send![center, getNotificationSettingsWithCompletionHandler: &*block];

    receiver.recv_timeout(Duration::from_secs(5)).ok()
  }
}

fn read_focus_status(request_focus_authorization: bool) -> Option<String> {
  unsafe {
    let center_class = Class::get("INFocusStatusCenter")?;
    let center: *mut Object = msg_send![center_class, defaultCenter];

    if center.is_null() {
      return Some("unsupported:center-null".to_string());
    }

    let mut authorization_status: i64 = msg_send![center, authorizationStatus];

    if authorization_status != FOCUS_STATUS_AUTHORIZED && request_focus_authorization {
      authorization_status = request_focus_status_authorization(center)?;
    }

    if authorization_status != FOCUS_STATUS_AUTHORIZED {
      return Some(format!("not-authorized:{}", authorization_status));
    }

    let focus_status: *mut Object = msg_send![center, focusStatus];

    if focus_status.is_null() {
      return Some("unknown:focus-status-null".to_string());
    }

    let is_focused_number: *mut Object = msg_send![focus_status, isFocused];

    if is_focused_number.is_null() {
      return Some("unknown:is-focused-null".to_string());
    }

    let is_focused: BOOL = msg_send![is_focused_number, boolValue];

    Some(focus_active_status(is_focused == YES))
  }
}

fn focus_active_status(is_active: bool) -> String {
  if is_active { "limited" } else { "normal" }.to_string()
}

fn request_focus_status_authorization(center: *mut Object) -> Option<i64> {
  let (sender, receiver) = mpsc::channel();

  unsafe {
    let block = ConcreteBlock::new(move |status: i64| {
      let _ = sender.send(status);
    })
    .copy();

    let _: () = msg_send![center, requestAuthorizationWithCompletionHandler: &*block];

    receiver.recv_timeout(Duration::from_secs(30)).ok()
  }
}

fn authorization_status(settings: *mut Object) -> String {
  unsafe {
    let status: i64 = msg_send![settings, authorizationStatus];

    match status {
      STATUS_AUTHORIZED => "granted",
      STATUS_DENIED => "denied",
      STATUS_NOT_DETERMINED => "not-determined",
      STATUS_PROVISIONAL | STATUS_EPHEMERAL => "limited",
      _ => "unknown",
    }
    .to_string()
  }
}

fn ns_string(value: &str) -> *mut Object {
  let c_value = CString::new(value).expect("static NSString input must not contain nul");

  unsafe { msg_send![class!(NSString), stringWithUTF8String: c_value.as_ptr()] }
}
