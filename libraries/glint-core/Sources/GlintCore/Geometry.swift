import Foundation

public struct GlintRect: Codable, Equatable, Hashable, Sendable {
    public var x: Double
    public var y: Double
    public var width: Double
    public var height: Double

    public init(x: Double, y: Double, width: Double, height: Double) {
        self.x = x
        self.y = y
        self.width = width
        self.height = height
    }

    public var minX: Double { x }
    public var minY: Double { y }
    public var midX: Double { x + width / 2 }
    public var midY: Double { y + height / 2 }
    public var maxX: Double { x + width }
    public var maxY: Double { y + height }
    public var area: Double { max(0, width) * max(0, height) }

    public func contains(_ other: GlintRect) -> Bool {
        other.minX >= minX && other.minY >= minY && other.maxX <= maxX && other.maxY <= maxY
    }

    public func intersection(_ other: GlintRect) -> GlintRect? {
        let left = max(minX, other.minX)
        let bottom = max(minY, other.minY)
        let right = min(maxX, other.maxX)
        let top = min(maxY, other.maxY)
        guard right > left, top > bottom else { return nil }
        return GlintRect(x: left, y: bottom, width: right - left, height: top - bottom)
    }
}

public enum WindowAction: String, Codable, CaseIterable, Identifiable, Sendable {
    case center
    case maximize
    case leftHalf
    case rightHalf
    case topHalf
    case bottomHalf
    case upperLeft
    case lowerLeft
    case upperRight
    case lowerRight
    case nextDisplay
    case previousDisplay
    case nextThird
    case previousThird
    case makeLarger
    case makeSmaller
    case undo
    case redo

    public var id: String { rawValue }

    public var shortcutIdentifier: String {
        switch self {
        case .center: "MoveToCenter"
        case .maximize: "MoveToFullscreen"
        case .leftHalf: "MoveToLeftHalf"
        case .rightHalf: "MoveToRightHalf"
        case .topHalf: "MoveToTopHalf"
        case .bottomHalf: "MoveToBottomHalf"
        case .upperLeft: "MoveToUpperLeft"
        case .lowerLeft: "MoveToLowerLeft"
        case .upperRight: "MoveToUpperRight"
        case .lowerRight: "MoveToLowerRight"
        case .nextDisplay: "MoveToNextDisplay"
        case .previousDisplay: "MoveToPreviousDisplay"
        case .nextThird: "MoveToNextThird"
        case .previousThird: "MoveToPreviousThird"
        case .makeLarger: "MakeLarger"
        case .makeSmaller: "MakeSmaller"
        case .undo: "UndoLastMove"
        case .redo: "RedoLastMove"
        }
    }

    public init?(shortcutIdentifier: String) {
        guard let action = Self.allCases.first(where: { $0.shortcutIdentifier == shortcutIdentifier }) else {
            return nil
        }
        self = action
    }
}

public enum GeometryEngine {
    public static func calculate(
        action: WindowAction,
        window: GlintRect,
        sourceScreen: GlintRect,
        destinationScreen: GlintRect
    ) -> GlintRect? {
        switch action {
        case .center:
            center(window, in: destinationScreen)
        case .maximize:
            destinationScreen
        case .leftHalf:
            horizontalCycle(window, in: destinationScreen, trailing: false, height: destinationScreen.height, y: destinationScreen.y)
        case .rightHalf:
            horizontalCycle(window, in: destinationScreen, trailing: true, height: destinationScreen.height, y: destinationScreen.y)
        case .topHalf:
            verticalCycle(window, in: destinationScreen, top: true)
        case .bottomHalf:
            verticalCycle(window, in: destinationScreen, top: false)
        case .upperLeft:
            cornerCycle(window, in: destinationScreen, trailing: false, top: true)
        case .lowerLeft:
            cornerCycle(window, in: destinationScreen, trailing: false, top: false)
        case .upperRight:
            cornerCycle(window, in: destinationScreen, trailing: true, top: true)
        case .lowerRight:
            cornerCycle(window, in: destinationScreen, trailing: true, top: false)
        case .nextThird:
            moveThird(window, in: destinationScreen, forward: true)
        case .previousThird:
            moveThird(window, in: destinationScreen, forward: false)
        case .makeLarger:
            resize(window, in: destinationScreen, offset: 30)
        case .makeSmaller:
            resize(window, in: destinationScreen, offset: -30)
        case .nextDisplay, .previousDisplay:
            fits(window, within: destinationScreen) ? center(window, in: destinationScreen) : destinationScreen
        case .undo, .redo:
            nil
        }
    }

    private static func center(_ window: GlintRect, in screen: GlintRect) -> GlintRect {
        var result = window
        result.x = floor(screen.width / 2) - floor(window.width / 2) + screen.x
        result.y = floor(screen.height / 2) - floor(window.height / 2) + screen.y
        return result
    }

    private static func horizontalCycle(
        _ window: GlintRect,
        in screen: GlintRect,
        trailing: Bool,
        height: Double,
        y: Double
    ) -> GlintRect {
        let halfWidth = floor(screen.width / 2)
        let halfX = trailing ? screen.x + halfWidth : screen.x
        let half = GlintRect(x: halfX, y: y, width: halfWidth, height: height)
        guard abs(window.midY - half.midY) <= 1 else { return half }

        let twoThirdWidth = floor(screen.width * 2 / 3)
        let twoThird = GlintRect(
            x: trailing ? screen.maxX - twoThirdWidth : screen.x,
            y: y,
            width: twoThirdWidth,
            height: height
        )
        if centered(window, within: half) { return twoThird }

        if centered(window, within: twoThird) {
            let thirdWidth = floor(screen.width / 3)
            return GlintRect(
                x: trailing ? screen.maxX - thirdWidth : screen.x,
                y: y,
                width: thirdWidth,
                height: height
            )
        }
        return half
    }

    private static func verticalCycle(_ window: GlintRect, in screen: GlintRect, top: Bool) -> GlintRect {
        let halfHeight = floor(screen.height / 2)
        let halfY = top ? screen.y + halfHeight + screen.height.truncatingRemainder(dividingBy: 2) : screen.y
        let half = GlintRect(x: screen.x, y: halfY, width: screen.width, height: halfHeight)
        guard abs(window.midX - half.midX) <= 1 else { return half }

        let twoThirdHeight = floor(screen.height * 2 / 3)
        let twoThird = GlintRect(
            x: screen.x,
            y: top ? screen.maxY - twoThirdHeight : screen.y,
            width: screen.width,
            height: twoThirdHeight
        )
        if centered(window, within: half) { return twoThird }

        if centered(window, within: twoThird) {
            let thirdHeight = floor(screen.height / 3)
            return GlintRect(
                x: screen.x,
                y: top ? screen.maxY - thirdHeight : screen.y,
                width: screen.width,
                height: thirdHeight
            )
        }
        return half
    }

    private static func cornerCycle(_ window: GlintRect, in screen: GlintRect, trailing: Bool, top: Bool) -> GlintRect {
        let halfHeight = floor(screen.height / 2)
        let y = top ? screen.y + halfHeight + screen.height.truncatingRemainder(dividingBy: 2) : screen.y
        return horizontalCycle(window, in: screen, trailing: trailing, height: halfHeight, y: y)
    }

    private static func moveThird(_ window: GlintRect, in screen: GlintRect, forward: Bool) -> GlintRect {
        let thirdWidth = floor(screen.width / 3)
        let thirdHeight = floor(screen.height / 3)
        var thirds = (0..<3).map { index in
            GlintRect(
                x: screen.x + thirdWidth * Double(index),
                y: screen.y,
                width: thirdWidth,
                height: screen.height
            )
        }
        thirds.append(contentsOf: (0..<3).map { index in
            GlintRect(
                x: screen.x,
                y: screen.maxY - thirdHeight * Double(index + 1),
                width: screen.width,
                height: thirdHeight
            )
        })

        guard let index = thirds.firstIndex(where: { centered(window, within: $0) }) else {
            return thirds[0]
        }
        let nextIndex = forward ? (index + 1) % thirds.count : (index - 1 + thirds.count) % thirds.count
        return thirds[nextIndex]
    }

    private static func resize(_ window: GlintRect, in screen: GlintRect, offset: Double) -> GlintRect {
        var resized = window
        resized.width += offset
        resized.x -= floor(offset / 2)

        if against(window.maxX - screen.maxX) {
            resized.x = screen.maxX - resized.width
            if against(window.x - screen.x) { resized.width = screen.width }
        }
        if against(window.x - screen.x) { resized.x = screen.x }
        if resized.width >= screen.width { resized.width = screen.width }

        resized.height += offset
        resized.y -= floor(offset / 2)
        if against(window.maxY - screen.maxY) {
            resized.y = screen.maxY - resized.height
            if against(window.y - screen.y) { resized.height = screen.height }
        }
        if against(window.y - screen.y) { resized.y = screen.y }
        if resized.height >= screen.height {
            resized.height = screen.height
            resized.y = window.y
        }

        if offset < 0 && againstAllEdges(window, screen: screen) {
            resized.width = window.width + offset
            resized.x = window.x - floor(offset / 2)
            resized.height = window.height + offset
            resized.y = window.y - floor(offset / 2)
        }

        let minimumWidth = floor(screen.width / 4)
        let minimumHeight = floor(screen.height / 4)
        if resized.width <= minimumWidth || resized.height <= minimumHeight { return window }
        return resized
    }

    private static func against(_ gap: Double) -> Bool { abs(gap) <= 5 }

    private static func againstAllEdges(_ window: GlintRect, screen: GlintRect) -> Bool {
        against(window.x - screen.x) && against(window.maxX - screen.maxX) &&
            against(window.y - screen.y) && against(window.maxY - screen.maxY)
    }

    private static func centered(_ window: GlintRect, within candidate: GlintRect) -> Bool {
        candidate.contains(window) && abs(window.midX - candidate.midX) <= 1 && abs(window.midY - candidate.midY) <= 1
    }

    private static func fits(_ window: GlintRect, within screen: GlintRect) -> Bool {
        window.width <= screen.width && window.height <= screen.height
    }
}
