import Foundation
import GlintCore

@MainActor
final class ShortcutPreferences: ObservableObject {
    @Published private(set) var defaults: [ShortcutDefault] = []
    @Published private var overrides: [String: String] = [:]
    @Published var registrationFailures: Set<WindowAction> = []
    @Published private(set) var recordingAction: WindowAction?
    var onChange: (() -> Void)?

    private let storageKey = "GlintShortcutOverrides"

    init() {
        defaults = (try? ShortcutDefault.load()) ?? []
        overrides = UserDefaults.standard.dictionary(forKey: storageKey) as? [String: String] ?? [:]
    }

    func beginRecording(_ action: WindowAction) {
        recordingAction = action
        onChange?()
    }

    func endRecording(_ action: WindowAction) {
        guard recordingAction == action else { return }
        recordingAction = nil
        onChange?()
    }

    var activeBindings: [WindowAction: ShortcutBinding] {
        Dictionary(uniqueKeysWithValues: WindowAction.allCases.compactMap { action in
            binding(for: action).map { (action, $0) }
        })
    }

    func defaultForAction(_ action: WindowAction) -> ShortcutDefault? {
        defaults.first(where: { $0.id == action.shortcutIdentifier })
    }

    func binding(for action: WindowAction) -> ShortcutBinding? {
        if let stored = overrides[action.shortcutIdentifier] {
            return stored.isEmpty ? nil : ShortcutBinding(spectacleString: stored)
        }
        return defaultForAction(action)?.shortcutBinding
    }

    func conflict(for binding: ShortcutBinding, excluding action: WindowAction) -> WindowAction? {
        WindowAction.allCases.first { $0 != action && self.binding(for: $0) == binding }
    }

    @discardableResult
    func set(_ binding: ShortcutBinding?, for action: WindowAction) -> Bool {
        if let binding, conflict(for: binding, excluding: action) != nil { return false }
        overrides[action.shortcutIdentifier] = binding?.spectacleString ?? ""
        persist()
        return true
    }

    func restore(_ action: WindowAction) {
        overrides.removeValue(forKey: action.shortcutIdentifier)
        persist()
    }

    func restoreAll() {
        overrides.removeAll()
        persist()
    }

    func isCustomized(_ action: WindowAction) -> Bool {
        overrides[action.shortcutIdentifier] != nil
    }

    private func persist() {
        UserDefaults.standard.set(overrides, forKey: storageKey)
        registrationFailures.removeAll()
        objectWillChange.send()
        onChange?()
    }
}
