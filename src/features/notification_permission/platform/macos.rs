use std::ffi::CString;
use std::sync::mpsc;
use std::time::Duration;

use block::ConcreteBlock;
use objc::runtime::{Object, BOOL, YES};
use objc::{class, msg_send, sel, sel_impl};

const STATUS_NOT_DETERMINED: i64 = 0;
const STATUS_DENIED: i64 = 1;
const STATUS_AUTHORIZED: i64 = 2;
const STATUS_PROVISIONAL: i64 = 3;
const STATUS_EPHEMERAL: i64 = 4;

pub fn get_permission_status(_app_user_model_id: Option<String>) -> String {
  if !is_app_bundle() {
    return "unknown".to_string();
  }

  read_notification_settings().unwrap_or_else(|| "unknown".to_string())
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
