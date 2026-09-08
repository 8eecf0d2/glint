import AppKit
import ApplicationServices
import GlintCore

enum WindowControlError: LocalizedError {
    case noApplication
    case noWindow
    case unsupportedWindow
    case noDisplay
    case noDestinationDisplay
    case noHistory
    case noMovement
    case accessibilityFailure

    var errorDescription: String? {
        switch self {
        case .noApplication: "No external application is available"
        case .noWindow: "The target application has no focused window"
        case .unsupportedWindow: "Sheets and system dialogs cannot be moved"
        case .noDisplay: "The window is not on an available display"
        case .noDestinationDisplay: "No other display is available"
        case .noHistory: "No window movement is available in history"
        case .noMovement: "The window is already at that position"
        case .accessibilityFailure: "macOS did not accept the requested window frame"
        }
    }
}

final class AXWindow: @unchecked Sendable, Hashable {
    let element: AXUIElement

    init(element: AXUIElement) {
        self.element = element
    }

    static func == (lhs: AXWindow, rhs: AXWindow) -> Bool {
        CFEqual(lhs.element, rhs.element)
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(CFHash(element))
    }
}

@MainActor
final class WindowController {
    private let applications = ExternalApplicationTracker()
    private let quantizedPolicy = QuantizedFramePolicy()
    private var history = ApplicationWindowHistory<AXWindow>()

    func perform(_ action: WindowAction) -> Result<Void, WindowControlError> {
        if action == .undo || action == .redo { return performHistory(action) }
        guard let application = applications.targetApplication() else { return .failure(.noApplication) }
        guard let bundleID = application.bundleIdentifier ?? application.localizedName else { return .failure(.noApplication) }
        guard let window = focusedWindow(for: application) else { return .failure(.noWindow) }
        guard !isUnsupported(window) else { return .failure(.unsupportedWindow) }
        guard let originalAXFrame = readFrame(window) else { return .failure(.accessibilityFailure) }

        let screens = screenSnapshots()
        guard let primaryHeight = NSScreen.screens.first?.frame.height else { return .failure(.noDisplay) }
        let currentFrame = CoordinateConverter.appKitRect(fromAX: originalAXFrame, primaryScreenHeight: primaryHeight)
        guard let source = DisplayEngine.sourceDisplay(
            containing: currentFrame,
            displays: screens,
            mainDisplayID: screenID(NSScreen.main)
        ) else { return .failure(.noDisplay) }
        guard let destination = DisplayEngine.destinationDisplay(from: source, action: action, displays: screens) else {
            return .failure(.noDestinationDisplay)
        }
        guard let targetFrame = GeometryEngine.calculate(
            action: action,
            window: currentFrame,
            sourceScreen: source.visibleFrame,
            destinationScreen: destination.visibleFrame
        ) else { return .failure(.noMovement) }
        guard targetFrame != currentFrame else { return .failure(.noMovement) }

        let targetAXFrame = CoordinateConverter.axRect(fromAppKit: targetFrame, primaryScreenHeight: primaryHeight)
        let visibleAXFrame = CoordinateConverter.axRect(fromAppKit: destination.visibleFrame, primaryScreenHeight: primaryHeight)
        guard let actualFrame = apply(targetAXFrame, visibleFrame: visibleAXFrame, to: window) else {
            return .failure(.accessibilityFailure)
        }
        guard actualFrame != originalAXFrame else { return .failure(.accessibilityFailure) }
        history.recordMove(applicationID: bundleID, windowID: window, from: originalAXFrame, to: actualFrame)
        return .success(())
    }

    private func performHistory(_ action: WindowAction) -> Result<Void, WindowControlError> {
        guard let application = applications.targetApplication() else { return .failure(.noApplication) }
        guard let bundleID = application.bundleIdentifier ?? application.localizedName else { return .failure(.noApplication) }
        for _ in 0..<50 {
            let entry = action == .undo ? history.undo(applicationID: bundleID) : history.redo(applicationID: bundleID)
            guard let entry else { return .failure(.noHistory) }
            guard readFrame(entry.windowID) != nil else { continue }
            let screens = screenSnapshots()
            guard let primaryHeight = NSScreen.screens.first?.frame.height else { return .failure(.noDisplay) }
            let appKitFrame = CoordinateConverter.appKitRect(fromAX: entry.frame, primaryScreenHeight: primaryHeight)
            guard let screen = DisplayEngine.sourceDisplay(
                containing: appKitFrame,
                displays: screens,
                mainDisplayID: screenID(NSScreen.main)
            ) else { return .failure(.noDisplay) }
            let visibleAX = CoordinateConverter.axRect(fromAppKit: screen.visibleFrame, primaryScreenHeight: primaryHeight)
            if apply(entry.frame, visibleFrame: visibleAX, to: entry.windowID) != nil { return .success(()) }
        }
        return .failure(.noHistory)
    }

    private func focusedWindow(for application: NSRunningApplication) -> AXWindow? {
        let applicationElement = AXUIElementCreateApplication(application.processIdentifier)
        AXUIElementSetMessagingTimeout(applicationElement, Float(quantizedPolicy.timeout))
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(applicationElement, kAXFocusedWindowAttribute as CFString, &value) == .success,
              let value,
              CFGetTypeID(value) == AXUIElementGetTypeID()
        else { return nil }
        let window = AXWindow(element: value as! AXUIElement)
        AXUIElementSetMessagingTimeout(window.element, Float(quantizedPolicy.timeout))
        return window
    }

    private func isUnsupported(_ window: AXWindow) -> Bool {
        copyString(kAXRoleAttribute, from: window) == (kAXSheetRole as String) ||
            copyString(kAXSubroleAttribute, from: window) == (kAXSystemDialogSubrole as String)
    }

    private func copyString(_ attribute: String, from window: AXWindow) -> String? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(window.element, attribute as CFString, &value) == .success else { return nil }
        return value as? String
    }

    private func readFrame(_ window: AXWindow) -> GlintRect? {
        var positionValue: CFTypeRef?
        var sizeValue: CFTypeRef?
        guard AXUIElementCopyAttributeValue(window.element, kAXPositionAttribute as CFString, &positionValue) == .success,
              AXUIElementCopyAttributeValue(window.element, kAXSizeAttribute as CFString, &sizeValue) == .success,
              let positionValue,
              let sizeValue,
              CFGetTypeID(positionValue) == AXValueGetTypeID(),
              CFGetTypeID(sizeValue) == AXValueGetTypeID()
        else { return nil }
        var position = CGPoint.zero
        var size = CGSize.zero
        guard AXValueGetValue(positionValue as! AXValue, .cgPoint, &position),
              AXValueGetValue(sizeValue as! AXValue, .cgSize, &size)
        else { return nil }
        return GlintRect(x: position.x, y: position.y, width: size.width, height: size.height)
    }

    private func setFrame(_ frame: GlintRect, on window: AXWindow) -> Bool {
        var position = CGPoint(x: frame.x, y: frame.y)
        var size = CGSize(width: frame.width, height: frame.height)
        guard let positionValue = AXValueCreate(.cgPoint, &position),
              let sizeValue = AXValueCreate(.cgSize, &size)
        else { return false }
        let firstSize = AXUIElementSetAttributeValue(window.element, kAXSizeAttribute as CFString, sizeValue)
        let positionResult = AXUIElementSetAttributeValue(window.element, kAXPositionAttribute as CFString, positionValue)
        let secondSize = AXUIElementSetAttributeValue(window.element, kAXSizeAttribute as CFString, sizeValue)
        return firstSize == .success || positionResult == .success || secondSize == .success
    }

    private func apply(_ requested: GlintRect, visibleFrame: GlintRect, to window: AXWindow) -> GlintRect? {
        guard setFrame(requested, on: window), var actual = readFrame(window) else { return nil }
        var adjusted = requested
        let deadline = CFAbsoluteTimeGetCurrent() + quantizedPolicy.timeout
        var attempts = 0
        while (actual.width > requested.width || actual.height > requested.height),
              attempts < quantizedPolicy.maximumAttempts,
              CFAbsoluteTimeGetCurrent() < deadline {
            guard let nextAdjustment = quantizedPolicy.nextAdjustment(
                requested: requested,
                proposed: adjusted,
                actual: actual
            ) else { break }
            adjusted = nextAdjustment
            guard setFrame(adjusted, on: window), let newActual = readFrame(window) else { break }
            actual = newActual
            attempts += 1
        }

        adjusted = quantizedPolicy.centeredAdjustment(requested: requested, proposed: adjusted, actual: actual)
        _ = setFrame(adjusted, on: window)
        guard var finalFrame = readFrame(window) else { return nil }

        if finalFrame.x < visibleFrame.x {
            finalFrame.x = visibleFrame.x
        } else if finalFrame.maxX > visibleFrame.maxX {
            finalFrame.x = visibleFrame.maxX - finalFrame.width
        }
        if finalFrame.y < visibleFrame.y {
            finalFrame.y = visibleFrame.y
        } else if finalFrame.maxY > visibleFrame.maxY {
            finalFrame.y = visibleFrame.maxY - finalFrame.height
        }
        _ = setFrame(finalFrame, on: window)
        return readFrame(window)
    }

    private func screenSnapshots() -> [GlintDisplay] {
        NSScreen.screens.compactMap { screen in
            guard let id = screenID(screen) else { return nil }
            return GlintDisplay(
                id: id,
                frame: GlintRect(screen.frame),
                visibleFrame: GlintRect(screen.visibleFrame)
            )
        }
    }

    private func screenID(_ screen: NSScreen?) -> UInt32? {
        (screen?.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value
    }
}

private extension GlintRect {
    init(_ rect: CGRect) {
        self.init(x: rect.origin.x, y: rect.origin.y, width: rect.width, height: rect.height)
    }
}

@MainActor
private final class ExternalApplicationTracker {
    private var lastApplication: NSRunningApplication?
    private var observer: NSObjectProtocol?

    init() {
        remember(NSWorkspace.shared.frontmostApplication)
        observer = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            let application = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication
            MainActor.assumeIsolated { self?.remember(application) }
        }
    }

    func targetApplication() -> NSRunningApplication? {
        remember(NSWorkspace.shared.frontmostApplication)
        guard lastApplication?.isTerminated == false else { return nil }
        return lastApplication
    }

    private func remember(_ application: NSRunningApplication?) {
        guard let application, application.processIdentifier != ProcessInfo.processInfo.processIdentifier else { return }
        lastApplication = application
    }
}
