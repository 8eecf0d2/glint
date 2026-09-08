import Foundation

public struct ShortcutDefault: Decodable, Identifiable, Sendable {
    public let id: String
    public let title: String
    public let binding: String
    public let display: String

    public var action: WindowAction? { WindowAction(shortcutIdentifier: id) }
    public var shortcutBinding: ShortcutBinding? { ShortcutBinding(spectacleString: binding) }

    public static func load() throws -> [ShortcutDefault] {
        let resources: Bundle
        if Bundle.main.bundleURL.pathExtension == "app" {
            guard let url = Bundle.main.url(forResource: "GlintCore_GlintCore", withExtension: "bundle"),
                  let packagedResources = Bundle(url: url) else {
                throw CocoaError(.fileNoSuchFile)
            }
            resources = packagedResources
        } else {
            resources = Bundle.module
        }
        guard let url = resources.url(forResource: "default-shortcuts", withExtension: "json") else {
            throw CocoaError(.fileNoSuchFile)
        }
        return try JSONDecoder().decode([ShortcutDefault].self, from: Data(contentsOf: url))
    }
}
