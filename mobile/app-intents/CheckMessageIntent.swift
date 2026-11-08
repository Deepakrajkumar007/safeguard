import AppIntents
import Foundation
import UserNotifications
internal import ExpoAppIntents

/// "Check Message with LinkGuard": a Shortcuts action for the "When I get a message" automation.
///
/// 1. Trusted senders are compared ON THIS IPHONE first. Their texts stop here and are never sent anywhere.
/// 2. Other texts go to LinkGuard's rule-based checker (no AI). Only the message text is sent.
/// 3. A risky result is shown as a local notification. Nothing is stored.
struct CheckMessageIntent: AppIntent {
  static let title: LocalizedStringResource = "Check Message with LinkGuard"
  static let description = IntentDescription(
    "Checks a text message for scam warning signs and warns you if it looks risky. Texts from your trusted senders are ignored on this iPhone."
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
    if let sender, !sender.isEmpty {
      let records = (try? await AppIntentEntityStore.shared.entities(ofKind: TrustedSenders.catalogKind)) ?? []
      if TrustedSenders.isTrusted(sender, ids: records.map { $0.id }) {
        return .result(value: "") // Trusted: stop here. Nothing leaves the phone.
      }
    }
    guard let verdict = await LinkGuardServer.check(message) else {
      return .result(value: "")
    }
    if verdict.show {
      await LinkGuardNotifier.show(title: verdict.title, body: verdict.body)
      return .result(value: verdict.notification)
    }
    return .result(value: "")
  }
}

/// Mirrors parseTrusted() in src/lib/trusted.ts so the phone and the server agree on what matches.
/// Catalog ids are "kind:value", e.g. "phone:+17165550123", "email:mom@icloud.com", "name:grandma linda".
enum TrustedSenders {
  static let catalogKind = "trustedSender"

  static func key(for raw: String) -> String? {
    let s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !s.isEmpty, s.count <= 120 else { return nil }
    if s.range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"#, options: .regularExpression) != nil {
      return "email:" + s.lowercased()
    }
    if s.range(of: #"^[+(0-9][0-9\s().-]*$"#, options: .regularExpression) != nil {
      let digits = String(s.unicodeScalars.filter { CharacterSet.decimalDigits.contains($0) && $0.isASCII })
      guard (7...15).contains(digits.count) else { return nil }
      if !s.hasPrefix("+") && digits.count == 10 { return "phone:+1" + digits }
      return "phone:+" + digits
    }
    let name = s.lowercased().split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    return name.isEmpty ? nil : "name:" + name
  }

  static func isTrusted(_ sender: String, ids: [String]) -> Bool {
    guard let k = key(for: sender) else { return false }
    return ids.contains(k)
  }
}

struct LinkGuardVerdict {
  let show: Bool
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
    request.httpBody = try? JSONSerialization.data(withJSONObject: ["text": String(text.prefix(5000))])

    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      guard (response as? HTTPURLResponse)?.statusCode == 200,
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
      else { return nil }
      return LinkGuardVerdict(
        show: (json["show"] as? String) == "yes",
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
  static func show(title: String, body: String) async {
    let center = UNUserNotificationCenter.current()
    let settings = await center.notificationSettings()
    guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
    let content = UNMutableNotificationContent()
    content.title = title
    content.body = body
    content.sound = .default
    let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
    try? await center.add(request)
  }
}
