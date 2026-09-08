import Carbon
import GlintCore

@MainActor
final class GlobalShortcutManager {
    var onAction: ((WindowAction) -> Void)?

    private struct Registration {
        let identifier: UInt32
        let binding: ShortcutBinding
        let hotKey: EventHotKeyRef
    }

    private var handler: EventHandlerRef?
    private var registrations: [WindowAction: Registration] = [:]
    private var actions: [UInt32: WindowAction] = [:]
    private let signature: OSType = 0x474C4E54

    @discardableResult
    func start() -> Bool {
        if handler != nil { return true }
        var eventType = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        let status = InstallEventHandler(
            GetApplicationEventTarget(),
            { _, event, userData in
                guard let event, let userData else { return noErr }
                var identifier = EventHotKeyID()
                let status = GetEventParameter(
                    event,
                    EventParamName(kEventParamDirectObject),
                    EventParamType(typeEventHotKeyID),
                    nil,
                    MemoryLayout<EventHotKeyID>.size,
                    nil,
                    &identifier
                )
                guard status == noErr else { return status }
                let manager = Unmanaged<GlobalShortcutManager>.fromOpaque(userData).takeUnretainedValue()
                MainActor.assumeIsolated { manager.handle(identifier.id) }
                return noErr
            },
            1,
            &eventType,
            Unmanaged.passUnretained(self).toOpaque(),
            &handler
        )
        return status == noErr && handler != nil
    }

    func register(_ bindings: [WindowAction: ShortcutBinding]) -> Set<WindowAction> {
        guard handler != nil else { return Set(bindings.keys) }
        var failures: Set<WindowAction> = []
        for (index, action) in WindowAction.allCases.enumerated() {
            let binding = bindings[action]
            if let registration = registrations[action], registration.binding != binding {
                UnregisterEventHotKey(registration.hotKey)
                registrations.removeValue(forKey: action)
                actions.removeValue(forKey: registration.identifier)
            }
            guard let binding else { continue }
            guard registrations[action] == nil else { continue }
            guard let keyCode = Self.keyCode(for: binding.key) else {
                failures.insert(action)
                continue
            }
            let identifier = UInt32(index + 1)
            var hotKey: EventHotKeyRef?
            let hotKeyID = EventHotKeyID(signature: signature, id: identifier)
            let status = RegisterEventHotKey(
                keyCode,
                Self.carbonModifiers(binding.modifiers),
                hotKeyID,
                GetApplicationEventTarget(),
                0,
                &hotKey
            )
            if status == noErr, let hotKey {
                registrations[action] = Registration(identifier: identifier, binding: binding, hotKey: hotKey)
                actions[identifier] = action
            } else {
                failures.insert(action)
            }
        }
        return failures
    }

    private func unregisterAll() {
        for registration in registrations.values { UnregisterEventHotKey(registration.hotKey) }
        registrations.removeAll()
        actions.removeAll()
    }

    private func handle(_ identifier: UInt32) {
        guard let action = actions[identifier] else { return }
        onAction?(action)
    }

    private static func carbonModifiers(_ modifiers: ShortcutModifiers) -> UInt32 {
        var result: UInt32 = 0
        if modifiers.contains(.command) { result |= UInt32(cmdKey) }
        if modifiers.contains(.option) { result |= UInt32(optionKey) }
        if modifiers.contains(.control) { result |= UInt32(controlKey) }
        if modifiers.contains(.shift) { result |= UInt32(shiftKey) }
        return result
    }

    static func keyCode(for key: String) -> UInt32? {
        let codes: [String: Int] = [
            "a": kVK_ANSI_A, "b": kVK_ANSI_B, "c": kVK_ANSI_C, "d": kVK_ANSI_D,
            "e": kVK_ANSI_E, "f": kVK_ANSI_F, "g": kVK_ANSI_G, "h": kVK_ANSI_H,
            "i": kVK_ANSI_I, "j": kVK_ANSI_J, "k": kVK_ANSI_K, "l": kVK_ANSI_L,
            "m": kVK_ANSI_M, "n": kVK_ANSI_N, "o": kVK_ANSI_O, "p": kVK_ANSI_P,
            "q": kVK_ANSI_Q, "r": kVK_ANSI_R, "s": kVK_ANSI_S, "t": kVK_ANSI_T,
            "u": kVK_ANSI_U, "v": kVK_ANSI_V, "w": kVK_ANSI_W, "x": kVK_ANSI_X,
            "y": kVK_ANSI_Y, "z": kVK_ANSI_Z,
            "0": kVK_ANSI_0, "1": kVK_ANSI_1, "2": kVK_ANSI_2, "3": kVK_ANSI_3,
            "4": kVK_ANSI_4, "5": kVK_ANSI_5, "6": kVK_ANSI_6, "7": kVK_ANSI_7,
            "8": kVK_ANSI_8, "9": kVK_ANSI_9,
            "left": kVK_LeftArrow, "right": kVK_RightArrow, "up": kVK_UpArrow, "down": kVK_DownArrow,
            "return": kVK_Return, "space": kVK_Space, "tab": kVK_Tab,
        ]
        return codes[key].map(UInt32.init)
    }
}
