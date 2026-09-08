import Foundation

public struct GlintDisplay: Equatable, Hashable, Identifiable, Sendable {
    public let id: UInt32
    public let frame: GlintRect
    public let visibleFrame: GlintRect

    public init(id: UInt32, frame: GlintRect, visibleFrame: GlintRect) {
        self.id = id
        self.frame = frame
        self.visibleFrame = visibleFrame
    }
}

public enum CoordinateConverter {
    public static func appKitRect(fromAX rect: GlintRect, primaryScreenHeight: Double) -> GlintRect {
        GlintRect(x: rect.x, y: primaryScreenHeight - rect.maxY, width: rect.width, height: rect.height)
    }

    public static func axRect(fromAppKit rect: GlintRect, primaryScreenHeight: Double) -> GlintRect {
        GlintRect(x: rect.x, y: primaryScreenHeight - rect.maxY, width: rect.width, height: rect.height)
    }
}

public enum DisplayEngine {
    public static func ordered(_ displays: [GlintDisplay]) -> [GlintDisplay] {
        displays.enumerated().sorted { left, right in
            let leftOrigin = left.element.frame.x == 0 && left.element.frame.y == 0
            let rightOrigin = right.element.frame.x == 0 && right.element.frame.y == 0
            if leftOrigin != rightOrigin { return leftOrigin }
            if left.element.frame.x != right.element.frame.x { return left.element.frame.x > right.element.frame.x }
            if left.element.frame.y != right.element.frame.y { return left.element.frame.y > right.element.frame.y }
            return left.offset < right.offset
        }.map(\.element)
    }

    public static func sourceDisplay(
        containing window: GlintRect,
        displays: [GlintDisplay],
        mainDisplayID: UInt32?
    ) -> GlintDisplay? {
        let sorted = ordered(displays)
        guard !sorted.isEmpty else { return nil }
        var result = sorted.first(where: { $0.id == mainDisplayID }) ?? sorted[0]
        var largestShare = 0.0
        for display in sorted {
            if display.frame.contains(window) { return display }
            let share = (window.intersection(display.frame)?.area ?? 0) / max(window.area, 1)
            if share > largestShare {
                largestShare = share
                result = display
            }
        }
        return result
    }

    public static func destinationDisplay(
        from source: GlintDisplay,
        action: WindowAction,
        displays: [GlintDisplay]
    ) -> GlintDisplay? {
        guard action == .nextDisplay || action == .previousDisplay else { return source }
        let sorted = ordered(displays)
        guard sorted.count > 1, let index = sorted.firstIndex(where: { $0.id == source.id }) else { return nil }
        let offset = action == .nextDisplay ? 1 : -1
        return sorted[(index + offset + sorted.count) % sorted.count]
    }
}
