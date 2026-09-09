import AppKit
import Foundation

@MainActor
final class UpdateChecker: ObservableObject {
    @Published private(set) var isChecking = false
    @Published private(set) var message = ""
    @Published private(set) var availableDownloadURL: URL?

    private struct Manifest: Decodable {
        let version: String
        let url: URL
        let sha256: String
    }

    func check() {
        guard !isChecking else { return }
        guard let value = Bundle.main.object(forInfoDictionaryKey: "GlintUpdateFeedURL") as? String,
              let feedURL = URL(string: value),
              feedURL.scheme == "https"
        else {
            message = "No update feed is configured for this build."
            return
        }
        isChecking = true
        message = "Checking for updates…"
        Task {
            defer { isChecking = false }
            do {
                let (data, response) = try await URLSession.shared.data(from: feedURL)
                guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                    throw URLError(.badServerResponse)
                }
                let manifest = try JSONDecoder().decode(Manifest.self, from: data)
                guard manifest.url.scheme == "https",
                      manifest.sha256.count == 64,
                      manifest.sha256.allSatisfy({ $0.isHexDigit })
                else { throw URLError(.cannotParseResponse) }
                let current = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
                if Self.compare(manifest.version, current) == .orderedDescending {
                    availableDownloadURL = manifest.url
                    message = "Glint \(manifest.version) is available. SHA-256: \(manifest.sha256.prefix(12))…"
                } else {
                    availableDownloadURL = nil
                    message = "Glint \(current) is up to date."
                }
            } catch {
                message = "Update check failed: \(error.localizedDescription)"
            }
        }
    }

    func openDownload() {
        guard let availableDownloadURL else { return }
        NSWorkspace.shared.open(availableDownloadURL)
    }

    private static func compare(_ left: String, _ right: String) -> ComparisonResult {
        let leftParts = left.split(separator: ".").map { Int($0) ?? 0 }
        let rightParts = right.split(separator: ".").map { Int($0) ?? 0 }
        for index in 0..<max(leftParts.count, rightParts.count) {
            let leftValue = index < leftParts.count ? leftParts[index] : 0
            let rightValue = index < rightParts.count ? rightParts[index] : 0
            if leftValue < rightValue { return .orderedAscending }
            if leftValue > rightValue { return .orderedDescending }
        }
        return .orderedSame
    }
}
