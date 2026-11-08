internal import ExpoModulesCore
import Foundation

/// The iPhone's list of recent text warnings, shown on the Text Alerts screen.
/// Stores the risky text, who sent it, LinkGuard's verdict, and the time, so the person can see which
/// message was flagged. Privacy: only texts LinkGuard WARNED about are kept (never texts with no red
/// flags), only on this iPhone (never sent to the server), newest first, at most 20,
/// and the person can clear them at any time.
enum WarningLog {
  static let key = "lg.textWarnings"
  static let limit = 20

  static func all() -> [[String: Any]] {
    UserDefaults.standard.array(forKey: key) as? [[String: Any]] ?? []
  }

  static func add(
    level: String, title: String, body: String, message: String, sender: String, notified: Bool, test: Bool = false
  ) {
    var list = all()
    list.insert(
      [
        "at": Date().timeIntervalSince1970 * 1000,
        "level": String(level.prefix(20)),
        "title": String(title.prefix(120)),
        "body": String(body.prefix(240)),
        "message": String(message.prefix(1000)),
        "sender": String(sender.prefix(120)),
        "notified": notified,
        "test": test,
      ],
      at: 0
    )
    UserDefaults.standard.set(Array(list.prefix(limit)), forKey: key)
  }

  static func clear() {
    UserDefaults.standard.removeObject(forKey: key)
  }
}

/// Lets the app's screens read (and clear) the warning list that the Shortcuts action writes.
final class LinkGuardWarnings: Module {
  public func definition() -> ExpoModulesCore.ModuleDefinition {
    Name("LinkGuardWarnings")

    Function("list") { () -> [[String: Any]] in
      WarningLog.all()
    }

    // For the in-app "Try it here" tester, so its result shows in the same list (marked as a test).
    Function("addTest") { (level: String, title: String, body: String, message: String, sender: String) in
      WarningLog.add(level: level, title: title, body: body, message: message, sender: sender, notified: true, test: true)
    }

    Function("clear") {
      WarningLog.clear()
    }
  }
}
