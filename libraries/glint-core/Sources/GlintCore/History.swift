import Foundation

public struct WindowHistoryEntry<WindowID: Hashable & Sendable>: Equatable, Sendable {
    public let windowID: WindowID
    public let frame: GlintRect

    public init(windowID: WindowID, frame: GlintRect) {
        self.windowID = windowID
        self.frame = frame
    }
}

public struct ApplicationWindowHistory<WindowID: Hashable & Sendable>: Sendable {
    private struct Timeline: Sendable {
        var entries: [WindowHistoryEntry<WindowID>] = []
        var currentIndex = -1
    }

    private var timelines: [String: Timeline] = [:]
    public let limit: Int

    public init(limit: Int = 50) {
        self.limit = max(2, limit)
    }

    public mutating func recordMove(
        applicationID: String,
        windowID: WindowID,
        from: GlintRect,
        to: GlintRect
    ) {
        var timeline = timelines[applicationID] ?? Timeline()
        if timeline.entries.isEmpty {
            timeline.entries.append(WindowHistoryEntry(windowID: windowID, frame: from))
            timeline.currentIndex = 0
        }
        if timeline.currentIndex < timeline.entries.count - 1 {
            timeline.entries.removeSubrange((timeline.currentIndex + 1)...)
        }
        timeline.entries.append(WindowHistoryEntry(windowID: windowID, frame: to))
        timeline.currentIndex = timeline.entries.count - 1
        if timeline.entries.count > limit {
            timeline.entries.removeFirst(timeline.entries.count - limit)
            timeline.currentIndex = timeline.entries.count - 1
        }
        timelines[applicationID] = timeline
    }

    public mutating func undo(applicationID: String) -> WindowHistoryEntry<WindowID>? {
        guard var timeline = timelines[applicationID], timeline.currentIndex > 0 else { return nil }
        timeline.currentIndex -= 1
        timelines[applicationID] = timeline
        return timeline.entries[timeline.currentIndex]
    }

    public mutating func redo(applicationID: String) -> WindowHistoryEntry<WindowID>? {
        guard var timeline = timelines[applicationID], timeline.currentIndex + 1 < timeline.entries.count else { return nil }
        timeline.currentIndex += 1
        timelines[applicationID] = timeline
        return timeline.entries[timeline.currentIndex]
    }

    public mutating func removeApplication(_ applicationID: String) {
        timelines.removeValue(forKey: applicationID)
    }
}
