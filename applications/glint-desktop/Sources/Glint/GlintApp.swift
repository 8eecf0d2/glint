import AppKit
import GlintCore
import SwiftUI

@main
struct GlintApp: App {
    @StateObject private var model = AppModel()

    init() {
        // Packaging smoke check: no AppModel activation, shortcuts, TCC or login changes.
        if CommandLine.arguments.contains("--verify-package") {
            guard let url = BrandAssets.menuBarURL, NSImage(contentsOf: url) != nil,
                  Bundle.main.bundleURL.pathExtension == "app",
                  let defaults = try? ShortcutDefault.load(), defaults.count == 18,
                  defaults.allSatisfy({ $0.action != nil && $0.shortcutBinding != nil }) else {
                FileHandle.standardError.write(Data("Packaged menu-bar or shortcut resources are missing or unreadable\n".utf8))
                exit(1)
            }
            print("Standalone package resources OK: \(url.path)")
            exit(0)
        }
    }

    var body: some Scene {
        MenuBarExtra {
            GlintMenu(model: model)
        } label: {
            GlintMenuBarLabel()
        }
        Settings {
            SettingsView(model: model)
        }
        .defaultSize(width: 620, height: 720)
        .windowResizability(.contentMinSize)
    }
}

private struct GlintMenuBarLabel: View {
    @Environment(\.openSettings) private var openSettings

    var body: some View {
        Image(nsImage: BrandAssets.menuBarIcon)
            .renderingMode(.template)
            .accessibilityLabel("Glint")
            .task {
                if CommandLine.arguments.contains("--settings") {
                    openSettings()
                    NSApp.activate(ignoringOtherApps: true)
                }
            }
    }
}

@MainActor
private enum BrandAssets {
    static var menuBarURL: URL? {
        // SwiftPM's generated accessor searches beside the app, then its original
        // build directory. Installed apps must resolve only their own resources.
        if Bundle.main.bundleURL.pathExtension == "app" {
            guard let url = Bundle.main.url(forResource: "GlintDesktop_Glint", withExtension: "bundle"),
                  let resources = Bundle(url: url) else { return nil }
            return resources.url(forResource: "GlintMenuBar", withExtension: "svg")
        }
        return Bundle.module.url(forResource: "GlintMenuBar", withExtension: "svg")
    }

    static let menuBarIcon: NSImage = {
        if let url = menuBarURL,
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

    var body: some View {
        if !model.accessibilityGranted {
            SettingsLink {
                Label("Accessibility Access Required", systemImage: "exclamationmark.triangle")
            }
            Divider()
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
