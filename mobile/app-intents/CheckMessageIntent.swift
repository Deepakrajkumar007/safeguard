import AppIntents
import Foundation
import OSLog
import UserNotifications
internal import ExpoAppIntents

/// "Check Message with LinkGuard": a Shortcuts action for the "When I get a message" automation.
///
/// 1. The text goes to LinkGuard's rule-based checker (no AI). Only the message text is sent.
/// 2. The sender stays on this iPhone; it's only shown in Recent warnings so you know who texted.
/// 3. A risky result is shown as a LinkGuard notification and added to the app's "Recent warnings"
///    (the risky text and its sender, kept only on this iPhone). Tapping the notification opens Text Alerts.
/// 4. If LinkGuard can't show its notification, the warning is handed to Shortcuts to show instead.
///
/// Diagnostics: `log stream`/Console lines tagged "LGTRACE" record each step. They contain the verdict
/// level only, never the message, the sender, or the links.
private let trace = Logger(subsystem: "com.deepakrajkumar.linkguard", category: "TextCheck")

struct CheckMessageIntent: AppIntent {
  static let title: LocalizedStringResource = "Check Message with LinkGuard"
  static let description = IntentDescription(
    "Checks a text message for scam warning signs and warns you if it looks risky."
  )
  static let openAppWhenRun: Bool = false

  @Parameter(title: "Message")
  var message: String

  @Parameter(title: "Sender")
  var sender: String?

  static var parameterSummary: some ParameterSummary {
    Summary("Check \(\.$message) from \(\.$sender) with LinkGuard")
  }

  func perform() async throws -> some IntentResult & ReturnsValue<String> {
    trace.notice("LGTRACE start hasSender=\(!(sender ?? "").isEmpty, privacy: .public)")
    guard let verdict = await LinkGuardServer.check(message) else {
      trace.error("LGTRACE server check failed")
      return .result(value: "")
    }
    trace.notice("LGTRACE verdict level=\(verdict.level, privacy: .public) show=\(verdict.show, privacy: .public)")
    guard verdict.show else { return .result(value: "") }

    let notified = await LinkGuardNotifier.show(title: verdict.title, body: verdict.body)
    WarningLog.add(
      level: verdict.level, title: verdict.title, body: verdict.body,
      message: message, sender: sender ?? "", notified: notified
    )
    if !notified {
      // Never silent: Shortcuts shows a thrown error's message as its own notification.
      throw LinkGuardWarning(message: verdict.notification)
    }
    return .result(value: verdict.notification)
  }
}

/// Used only when LinkGuard's own notification couldn't be shown, so Shortcuts displays the warning.
struct LinkGuardWarning: Error, CustomLocalizedStringResourceConvertible {
  let message: String
  var localizedStringResource: LocalizedStringResource { "\(message)" }
}

struct LinkGuardVerdict {
  let show: Bool
  let level: String
  let title: String
  let body: String
  let notification: String
}

/// Sends only the message text to the LinkGuard server's rule-based checker.
/// The server address and app key come from Info.plist (set at build time from mobile/.env.local).
enum LinkGuardServer {
  static func check(_ text: String) async -> LinkGuardVerdict? {
    guard let base = Bundle.main.object(forInfoDictionaryKey: "LinkGuardAPIBase") as? String,
          !base.isEmpty,
          let url = URL(string: base.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/api/shortcut")
    else { return nil }

    var request = URLRequest(url: url, timeoutInterval: 10)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    if let key = Bundle.main.object(forInfoDictionaryKey: "LinkGuardAppKey") as? String, !key.isEmpty {
      request.setValue(key, forHTTPHeaderField: "x-linkguard-key")
    }
    // "source" only tells the server log this came from the Shortcuts action (not the in-app tester).
    request.httpBody = try? JSONSerialization.data(withJSONObject: ["text": String(text.prefix(5000)), "source": "action"])

    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      guard (response as? HTTPURLResponse)?.statusCode == 200,
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
      else { return nil }
      return LinkGuardVerdict(
        show: (json["show"] as? String) == "yes",
        level: json["level"] as? String ?? "none",
        title: json["title"] as? String ?? "LinkGuard",
        body: json["body"] as? String ?? "",
        notification: json["notification"] as? String ?? ""
      )
    } catch {
      return nil
    }
  }
}

enum LinkGuardNotifier {
  /// Returns true only if iOS accepted the notification.
  static func show(title: String, body: String) async -> Bool {
    let center = UNUserNotificationCenter.current()
    let settings = await center.notificationSettings()
    trace.notice("LGTRACE notification auth=\(settings.authorizationStatus.rawValue, privacy: .public) alert=\(settings.alertSetting.rawValue, privacy: .public)")
    let allowed: [UNAuthorizationStatus] = [.authorized, .provisional, .ephemeral]
    guard allowed.contains(settings.authorizationStatus) else { return false }
    let content = UNMutableNotificationContent()
    content.title = title
    content.body = body
    content.sound = .default
    content.threadIdentifier = "linkguard-texts"
    content.userInfo = ["url": "/alerts"] // tapping it opens LinkGuard's Text Alerts screen
    let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
    do {
      try await center.add(request)
      trace.notice("LGTRACE notification added")
      return true
    } catch {
      trace.error("LGTRACE notification failed: \(error.localizedDescription, privacy: .public)")
      return false
    }
  }
}
