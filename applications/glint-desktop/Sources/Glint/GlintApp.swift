import AppKit
import GlintCore
import SwiftUI

@main
struct GlintApp: App {
    @StateObject private var model = AppModel()

    var body: some Scene {
        MenuBarExtra {
            GlintMenu(model: model)
        } label: {
            Image(nsImage: BrandAssets.menuBarIcon)
                .renderingMode(.template)
                .opacity(model.isPaused ? 0.45 : 1)
                .accessibilityLabel(model.isPaused ? "Glint paused" : "Glint")
        }
        Settings {
            SettingsView(model: model)
        }
    }
}

private enum BrandAssets {
    static let menuBarIcon: NSImage = {
        if let url = Bundle.module.url(forResource: "GlintMenuBar", withExtension: "svg"),
           let image = NSImage(contentsOf: url) {
            image.isTemplate = true
            return image
        }
        let fallback = NSImage(systemSymbolName: "sparkles", accessibilityDescription: "Glint") ?? NSImage(size: NSSize(width: 18, height: 18))
        fallback.isTemplate = true
        return fallback
    }()
}

private struct GlintMenu: View {
    @ObservedObject var model: AppModel
    @Environment(\.openSettings) private var openSettings

    private let groups: [[WindowAction]] = [
        [.center, .maximize],
        [.leftHalf, .rightHalf, .topHalf, .bottomHalf],
        [.upperLeft, .lowerLeft, .upperRight, .lowerRight],
        [.nextDisplay, .previousDisplay, .nextThird, .previousThird],
        [.makeLarger, .makeSmaller],
        [.undo, .redo],
    ]

    var body: some View {
        if !model.accessibilityGranted {
            SettingsLink {
                Label("Accessibility Access Required", systemImage: "exclamationmark.triangle")
            }
            Divider()
        }
        ForEach(Array(groups.enumerated()), id: \.offset) { groupIndex, actions in
            if groupIndex > 0 { Divider() }
            ForEach(actions) { action in
                Button {
                    model.perform(action)
                } label: {
                    HStack {
                        Text(model.title(for: action))
                        Spacer()
                        Text(model.shortcutDisplay(for: action))
                    }
                }
                .disabled(model.isPaused)
            }
        }
        Divider()
        Button(model.isPaused ? "Resume Glint" : "Pause Glint") {
            model.togglePaused()
        }
        SettingsLink { Text("Settings…") }
        Button("Check for Updates…") {
            openSettings()
            model.checkForUpdates()
        }
        Button("About Glint") { NSApplication.shared.orderFrontStandardAboutPanel(nil) }
        Divider()
        Button("Quit Glint") { NSApplication.shared.terminate(nil) }
            .keyboardShortcut("q")
    }
}
