import AppKit
import Carbon
import GlintCore
import SwiftUI

struct SettingsView: View {
    @ObservedObject var model: AppModel
    @ObservedObject private var shortcuts: ShortcutPreferences
    @ObservedObject private var updates: UpdateChecker

    init(model: AppModel) {
        self.model = model
        shortcuts = model.shortcuts
        updates = model.updates
    }

    var body: some View {
        Form {
            Section("General") {
                LabeledContent("Accessibility") {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(model.accessibilityGranted ? Color.green : Color.orange)
                            .frame(width: 8, height: 8)
                        Text(model.accessibilityGranted ? "Granted" : "Required")
                    }
                }
                HStack {
                    Button("Request Access") { model.requestAccessibility() }
                    Button("Open Accessibility Settings") { model.openAccessibilitySettings() }
                    Button("Reveal This Copy") { model.revealApp() }
                }
                if !model.accessibilityGranted {
                    Text("If Glint is already enabled, remove its old Accessibility row, add this exact app copy again, and relaunch. Ad-hoc build updates can change the identity macOS stores.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Toggle("Launch Glint at login", isOn: Binding(
                    get: { model.launchAtLoginEnabled },
                    set: { model.setLaunchAtLogin($0) }
                ))
                Toggle("Pause global shortcuts", isOn: Binding(
                    get: { model.isPaused },
                    set: { _ in model.togglePaused() }
                ))
                LabeledContent("Status", value: model.statusMessage)
                    .foregroundStyle(.secondary)
            }

            Section("Shortcuts") {
                ForEach(WindowAction.allCases) { action in
                    ShortcutRow(action: action, preferences: shortcuts, title: model.title(for: action))
                }
                HStack {
                    Spacer()
                    Button("Restore All Defaults") { shortcuts.restoreAll() }
                }
            }

            Section("About") {
                LabeledContent("Glint", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "Development")
                HStack {
                    Button(updates.isChecking ? "Checking…" : "Check for Updates") { updates.check() }
                        .disabled(updates.isChecking)
                    if updates.availableDownloadURL != nil {
                        Button("Open Download") { updates.openDownload() }
                    }
                }
                Text(updates.message)
                    .foregroundStyle(.secondary)
                Text("Glint controls only window position and size through macOS Accessibility. It does not inspect window contents.")
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .frame(width: 620, height: 720)
        .onAppear { model.refreshSystemState() }
    }
}

private struct ShortcutRow: View {
    let action: WindowAction
    @ObservedObject var preferences: ShortcutPreferences
    let title: String

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                if preferences.registrationFailures.contains(action) {
                    Text("Unavailable or already used by another app")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }
            Spacer()
            ShortcutRecorderButton(action: action, preferences: preferences)
                .frame(width: 130)
            Button {
                preferences.set(nil, for: action)
            } label: {
                Image(systemName: "xmark")
            }
            .buttonStyle(.borderless)
            .help("Clear shortcut")
            .disabled(preferences.binding(for: action) == nil)
            Button {
                preferences.restore(action)
            } label: {
                Image(systemName: "arrow.counterclockwise")
            }
            .buttonStyle(.borderless)
            .help("Restore default")
            .disabled(!preferences.isCustomized(action))
        }
        .padding(.vertical, 2)
    }
}

private struct ShortcutRecorderButton: View {
    let action: WindowAction
    @ObservedObject var preferences: ShortcutPreferences
    @State private var isRecording = false
    @State private var eventMonitor: Any?
    @State private var errorMessage: String?

    var body: some View {
        VStack(alignment: .trailing, spacing: 2) {
            Button(isRecording ? "Type Shortcut…" : (preferences.binding(for: action)?.display ?? "Record Shortcut")) {
                isRecording ? stopRecording() : startRecording()
            }
            .buttonStyle(.bordered)
            if let errorMessage {
                Text(errorMessage)
                    .font(.caption2)
                    .foregroundStyle(.red)
                    .lineLimit(1)
            }
        }
        .onDisappear { stopRecording() }
    }

    private func startRecording() {
        stopRecording()
        errorMessage = nil
        isRecording = true
        eventMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
            MainActor.assumeIsolated { handle(event) }
            return nil
        }
    }

    private func stopRecording() {
        if let eventMonitor { NSEvent.removeMonitor(eventMonitor) }
        eventMonitor = nil
        isRecording = false
    }

    private func handle(_ event: NSEvent) {
        if event.keyCode == UInt16(kVK_Escape) {
            stopRecording()
            return
        }
        if event.keyCode == UInt16(kVK_Delete) || event.keyCode == UInt16(kVK_ForwardDelete) {
            preferences.set(nil, for: action)
            stopRecording()
            return
        }
        guard let key = Self.keyName(event) else {
            errorMessage = "Unsupported key"
            return
        }
        guard GlobalShortcutManager.keyCode(for: key) != nil else {
            errorMessage = "Unsupported key"
            return
        }
        let binding = ShortcutBinding(key: key, modifiers: Self.modifiers(event.modifierFlags))
        guard !binding.modifiers.isEmpty else {
            errorMessage = "Add a modifier"
            return
        }
        guard preferences.set(binding, for: action) else {
            errorMessage = "Already assigned"
            return
        }
        stopRecording()
    }

    private static func modifiers(_ flags: NSEvent.ModifierFlags) -> ShortcutModifiers {
        let flags = flags.intersection(.deviceIndependentFlagsMask)
        var result: ShortcutModifiers = []
        if flags.contains(.control) { result.insert(.control) }
        if flags.contains(.option) { result.insert(.option) }
        if flags.contains(.shift) { result.insert(.shift) }
        if flags.contains(.command) { result.insert(.command) }
        return result
    }

    private static func keyName(_ event: NSEvent) -> String? {
        let special: [UInt16: String] = [
            UInt16(kVK_LeftArrow): "left", UInt16(kVK_RightArrow): "right",
            UInt16(kVK_UpArrow): "up", UInt16(kVK_DownArrow): "down",
            UInt16(kVK_Return): "return", UInt16(kVK_Space): "space", UInt16(kVK_Tab): "tab",
        ]
        if let key = special[event.keyCode] { return key }
        guard let characters = event.charactersIgnoringModifiers?.lowercased(), characters.count == 1 else { return nil }
        return characters
    }
}
