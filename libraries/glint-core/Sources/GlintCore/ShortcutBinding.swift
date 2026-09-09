import Foundation

public struct ShortcutModifiers: OptionSet, Codable, Hashable, Sendable {
    public let rawValue: UInt32

    public init(rawValue: UInt32) {
        self.rawValue = rawValue
    }

    public static let control = ShortcutModifiers(rawValue: 1 << 0)
    public static let option = ShortcutModifiers(rawValue: 1 << 1)
    public static let shift = ShortcutModifiers(rawValue: 1 << 2)
    public static let command = ShortcutModifiers(rawValue: 1 << 3)
}

public struct ShortcutBinding: Codable, Equatable, Hashable, Sendable {
    public let key: String
    public let modifiers: ShortcutModifiers

    public init(key: String, modifiers: ShortcutModifiers) {
        self.key = key.lowercased()
        self.modifiers = modifiers
    }

    public init?(spectacleString: String) {
        let tokens = spectacleString.lowercased().split(separator: "+").map(String.init)
        guard let key = tokens.last, !key.isEmpty else { return nil }
        var modifiers: ShortcutModifiers = []
        for token in tokens.dropLast() {
            switch token {
            case "ctrl", "control": modifiers.insert(.control)
            case "alt", "option": modifiers.insert(.option)
            case "shift": modifiers.insert(.shift)
            case "cmd", "command": modifiers.insert(.command)
            default: return nil
            }
        }
        self.init(key: key, modifiers: modifiers)
    }

    public var spectacleString: String {
        var tokens: [String] = []
        if modifiers.contains(.control) { tokens.append("ctrl") }
        if modifiers.contains(.option) { tokens.append("alt") }
        if modifiers.contains(.shift) { tokens.append("shift") }
        if modifiers.contains(.command) { tokens.append("cmd") }
        tokens.append(key)
        return tokens.joined(separator: "+")
    }

    public var display: String {
        var value = ""
        if modifiers.contains(.control) { value += "⌃" }
        if modifiers.contains(.option) { value += "⌥" }
        if modifiers.contains(.shift) { value += "⇧" }
        if modifiers.contains(.command) { value += "⌘" }
        let keyDisplay = switch key {
        case "left": "←"
        case "right": "→"
        case "up": "↑"
        case "down": "↓"
        case "return": "↩"
        case "space": "Space"
        default: key.uppercased()
        }
        value += keyDisplay
        return value
    }
}
