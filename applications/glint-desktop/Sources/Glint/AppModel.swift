import AppKit
import ApplicationServices
import GlintCore
import ServiceManagement

@MainActor
final class AppModel: ObservableObject {
    @Published private(set) var accessibilityGranted = AXIsProcessTrusted()
    @Published private(set) var statusMessage = "Ready"
    @Published private(set) var launchAtLoginEnabled = SMAppService.mainApp.status == .enabled

    let shortcuts: ShortcutPreferences
    let updates = UpdateChecker()
    private let hotKeys = GlobalShortcutManager()
    private let windows = WindowController()
    private var activationObserver: NSObjectProtocol?
    private var systemStateTimer: Timer?
    private var localShortcutMonitor: Any?

    init() {
        shortcuts = ShortcutPreferences()
        hotKeys.onAction = { [weak self] action in self?.perform(action) }
        hotKeys.start()
        shortcuts.onChange = { [weak self] in self?.registerShortcuts() }
        activationObserver = NotificationCenter.default.addObserver(
            forName: NSApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated { self?.refreshSystemState() }
        }
        systemStateTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.refreshSystemState() }
        }
        localShortcutMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            let handled = MainActor.assumeIsolated {
                guard let self, self.windows.targetsOwnWindow,
                      self.shortcuts.recordingAction == nil else { return false }
                let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
                var modifiers: ShortcutModifiers = []
                if flags.contains(.command) { modifiers.insert(.command) }
                if flags.contains(.option) { modifiers.insert(.option) }
                if flags.contains(.control) { modifiers.insert(.control) }
                if flags.contains(.shift) { modifiers.insert(.shift) }
                guard let action = self.shortcuts.activeBindings.first(where: {
                    $0.value.modifiers == modifiers && GlobalShortcutManager.keyCode(for: $0.value.key) == UInt32(event.keyCode)
                })?.key else { return false }
                self.perform(action)
                return true
            }
            return handled ? nil : event
        }
        registerShortcuts()
    }

    func perform(_ action: WindowAction) {
        guard shortcuts.recordingAction == nil else { return }
        accessibilityGranted = AXIsProcessTrusted()
        guard windows.targetsOwnWindow || accessibilityGranted else {
            requestAccessibility()
            NSSound.beep()
            return
        }
        switch windows.perform(action) {
        case .success:
            statusMessage = "Moved window: \(title(for: action))"
        case .failure(let error):
            statusMessage = error.localizedDescription
            NSSound.beep()
        }
    }

    func title(for action: WindowAction) -> String {
        shortcuts.defaultForAction(action)?.title ?? action.rawValue
    }

    func requestAccessibility() {
        let options = ["AXTrustedCheckOptionPrompt": true] as CFDictionary
        accessibilityGranted = AXIsProcessTrustedWithOptions(options)
        statusMessage = accessibilityGranted
            ? "Accessibility access granted"
            : "Enable this Glint build in Accessibility, then relaunch"
    }

    func setLaunchAtLogin(_ enabled: Bool) {
        do {
            if enabled {
                if SMAppService.mainApp.status != .enabled { try SMAppService.mainApp.register() }
            } else if SMAppService.mainApp.status == .enabled {
                try SMAppService.mainApp.unregister()
            }
            launchAtLoginEnabled = SMAppService.mainApp.status == .enabled
            statusMessage = launchAtLoginEnabled ? "Launch at login enabled" : "Launch at login disabled"
        } catch {
            launchAtLoginEnabled = SMAppService.mainApp.status == .enabled
            statusMessage = "Could not update login item: \(error.localizedDescription)"
        }
    }

    func refreshSystemState() {
        let wasGranted = accessibilityGranted
        accessibilityGranted = AXIsProcessTrusted()
        launchAtLoginEnabled = SMAppService.mainApp.status == .enabled
        if accessibilityGranted != wasGranted {
            statusMessage = accessibilityGranted
                ? "Accessibility access granted"
                : "Accessibility access is no longer valid"
        }
        if !shortcuts.registrationFailures.isEmpty {
            registerShortcuts()
        }
    }

    func checkForUpdates() {
        updates.check()
    }

    private func registerShortcuts() {
        let failures = hotKeys.register(shortcuts.recordingAction == nil ? shortcuts.activeBindings : [:])
        shortcuts.registrationFailures = failures
        if !failures.isEmpty {
            statusMessage = "\(failures.count) shortcut conflict(s)"
        } else if accessibilityGranted {
            statusMessage = "All global shortcuts registered"
        } else {
            statusMessage = "Accessibility access required"
        }
    }
}
