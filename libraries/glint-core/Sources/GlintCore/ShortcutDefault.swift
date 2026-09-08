import Foundation

public struct ShortcutDefault: Decodable, Identifiable, Sendable {
    public let id: String
    public let title: String
    public let binding: String
    public let display: String

    public static func load() throws -> [ShortcutDefault] {
        guard let url = Bundle.module.url(forResource: "default-shortcuts", withExtension: "json") else {
            throw CocoaError(.fileNoSuchFile)
        }
        return try JSONDecoder().decode([ShortcutDefault].self, from: Data(contentsOf: url))
    }
}
