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
            Section {
                LabeledContent("Accessibility") {
                    if model.accessibilityGranted {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 8, height: 8)
                            .accessibilityLabel("Accessibility access granted")
                    } else {
                        Button("Request access") { model.requestAccessibility() }
                    }
                }
                Toggle("Launch Glint at login", isOn: Binding(
                    get: { model.launchAtLoginEnabled },
                    set: { model.setLaunchAtLogin($0) }
                ))
                HStack {
                    Text("Glint \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "Development")")
                    Spacer()
                    Button("Open folder") {
                        NSWorkspace.shared.activateFileViewerSelecting([Bundle.main.bundleURL])
                    }
                    Button(updates.isChecking ? "Checking…" : "Check for updates") { updates.check() }
                        .disabled(updates.isChecking)
                    if updates.availableDownloadURL != nil {
                        Button("Open Download") { updates.openDownload() }
                    }
                }
                if !updates.message.isEmpty {
                    Text(updates.message)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Section("Keyboard shortcuts") {
                ForEach(WindowAction.allCases) { action in
                    ShortcutRow(action: action, preferences: shortcuts, title: model.title(for: action))
                }
                HStack {
                    Spacer()
                    Button("Restore All Defaults") { shortcuts.restoreAll() }
                }
            }


        }
        .formStyle(.grouped)
        .contentMargins(.top, 8, for: .scrollContent)
        .navigationTitle("")
        .toolbarBackground(.hidden, for: .windowToolbar)
        .frame(width: 620, height: 720)
        .background(SettingsWindowChrome())
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

// Extend the background through native window chrome without a toolbar divider.
private struct SettingsWindowChrome: NSViewRepresentable {
    func makeNSView(context: Context) -> ChromeView { ChromeView() }
    func updateNSView(_ nsView: ChromeView, context: Context) {}

    final class ChromeView: NSView {
        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            NotificationCenter.default.removeObserver(self)
            guard let window else { return }
            NotificationCenter.default.addObserver(
                self, selector: #selector(settingsDidOpen),
                name: NSWindow.didBecomeKeyNotification, object: window
            )
            NotificationCenter.default.addObserver(
                self, selector: #selector(settingsWillClose),
                name: NSWindow.willCloseNotification, object: window
            )
            settingsDidOpen()
            window.title = ""
            window.titleVisibility = .hidden
            window.styleMask.insert(.fullSizeContentView)
            window.toolbarStyle = .unified
            if window.toolbar == nil {
                let toolbar = NSToolbar(identifier: "GlintSettingsToolbar")
                toolbar.showsBaselineSeparator = false
                window.toolbar = toolbar
            }
            window.titlebarAppearsTransparent = true
            window.titlebarSeparatorStyle = .none
        }

        @objc private func settingsDidOpen() {
            window?.title = ""
            window?.titleVisibility = .hidden
            if NSApp.activationPolicy() != .regular {
                NSApp.setActivationPolicy(.regular)
            }
        }

        @objc private func settingsWillClose() {
            NSApp.setActivationPolicy(.accessory)
        }
    }
}
