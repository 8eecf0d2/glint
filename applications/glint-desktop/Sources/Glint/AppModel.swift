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
        registerShortcuts()
    }

    func perform(_ action: WindowAction) {
        accessibilityGranted = AXIsProcessTrusted()
        guard accessibilityGranted else {
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
        let failures = hotKeys.register(shortcuts.activeBindings)
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
