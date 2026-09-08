import AppKit
import SwiftUI
import GlintCore

@main
struct GlintApp: App {
    var body: some Scene {
        MenuBarExtra("Glint", systemImage: "rectangle.split.2x2") {
            Text("Glint — development scaffold")
            SettingsLink { Text("Settings…") }
            Divider()
            Button("Quit Glint") { NSApplication.shared.terminate(nil) }
                .keyboardShortcut("q")
        }
        Settings { GlintSettingsView() }
    }
}

private struct GlintSettingsView: View {
    private let shortcuts = Result { try ShortcutDefault.load() }

    var body: some View {
        Form {
            Section {
                Text("Window controls are still in development.")
                Text("These are the captured defaults. Shortcut editing and window movement will be added next.")
                    .foregroundStyle(.secondary)
            }
            Section("Default shortcuts") {
                switch shortcuts {
                case .success(let defaults):
                    ForEach(defaults) { shortcut in
                        LabeledContent(shortcut.title, value: shortcut.display)
                    }
                case .failure:
                    Text("The default shortcuts could not be loaded.")
                }
            }
        }
        .formStyle(.grouped)
        .frame(width: 520, height: 620)
    }
}
