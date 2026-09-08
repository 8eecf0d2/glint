import Foundation

public struct QuantizedFramePolicy: Sendable {
    public let minimumRatio: Double
    public let maximumAttempts: Int
    public let timeout: TimeInterval

    public init(minimumRatio: Double = 0.85, maximumAttempts: Int = 64, timeout: TimeInterval = 0.25) {
        self.minimumRatio = minimumRatio
        self.maximumAttempts = maximumAttempts
        self.timeout = timeout
    }

    public func nextAdjustment(requested: GlintRect, proposed: GlintRect, actual: GlintRect) -> GlintRect? {
        var result = proposed
        if actual.width > requested.width { result.width -= 2 }
        if actual.height > requested.height { result.height -= 2 }
        guard result.width >= requested.width * minimumRatio,
              result.height >= requested.height * minimumRatio
        else { return nil }
        return result
    }

    public func centeredAdjustment(requested: GlintRect, proposed: GlintRect, actual: GlintRect) -> GlintRect {
        var result = proposed
        result.x += floor((requested.width - actual.width) / 2)
        result.y += floor((requested.height - actual.height) / 2)
        return result
    }
}
