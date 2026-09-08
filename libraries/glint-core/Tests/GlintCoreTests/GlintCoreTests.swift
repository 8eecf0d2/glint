import Foundation
import Testing
@testable import GlintCore

private struct FixtureCorpus: Decodable {
    let source: Source
    let fixtures: [Fixture]

    struct Source: Decodable {
        let commit: String
    }

    struct Fixture: Decodable {
        let name: String
        let action: WindowAction
        let window: GlintRect
        let source: GlintRect
        let destination: GlintRect
        let expected: GlintRect
    }
}

@Test("Swift geometry matches the pinned Spectacle 1.2 corpus")
func spectacleFixtureParity() throws {
    let url = try #require(Bundle.module.url(forResource: "spectacle-1.2", withExtension: "json", subdirectory: "Fixtures"))
    let corpus = try JSONDecoder().decode(FixtureCorpus.self, from: Data(contentsOf: url))
    #expect(corpus.source.commit == "eacf5bb6499257c83e03f51660f38106af8ee914")
    #expect(corpus.fixtures.count >= 100)
    for fixture in corpus.fixtures {
        let actual = GeometryEngine.calculate(
            action: fixture.action,
            window: fixture.window,
            sourceScreen: fixture.source,
            destinationScreen: fixture.destination
        )
        #expect(actual == fixture.expected, "Fixture failed: \(fixture.name)")
    }
}

@Test("Display order, selection, traversal and coordinate conversion")
func displayBehavior() throws {
    let primary = GlintDisplay(
        id: 1,
        frame: GlintRect(x: 0, y: 0, width: 1440, height: 900),
        visibleFrame: GlintRect(x: 0, y: 25, width: 1440, height: 875)
    )
    let left = GlintDisplay(
        id: 2,
        frame: GlintRect(x: -1280, y: -100, width: 1280, height: 800),
        visibleFrame: GlintRect(x: -1280, y: -100, width: 1280, height: 778)
    )
    let above = GlintDisplay(
        id: 3,
        frame: GlintRect(x: 200, y: 900, width: 1024, height: 768),
        visibleFrame: GlintRect(x: 200, y: 900, width: 1024, height: 745)
    )
    let displays = [left, above, primary]
    #expect(DisplayEngine.ordered(displays).map(\.id) == [1, 3, 2])

    let straddling = GlintRect(x: -300, y: 100, width: 500, height: 500)
    let source = try #require(DisplayEngine.sourceDisplay(containing: straddling, displays: displays, mainDisplayID: 1))
    #expect(source.id == 2)
    #expect(DisplayEngine.destinationDisplay(from: source, action: .nextDisplay, displays: displays)?.id == 1)
    #expect(DisplayEngine.destinationDisplay(from: primary, action: .previousDisplay, displays: displays)?.id == 2)

    let ax = GlintRect(x: -100, y: 40, width: 400, height: 300)
    let appKit = CoordinateConverter.appKitRect(fromAX: ax, primaryScreenHeight: 900)
    #expect(appKit == GlintRect(x: -100, y: 560, width: 400, height: 300))
    #expect(CoordinateConverter.axRect(fromAppKit: appKit, primaryScreenHeight: 900) == ax)
}

@Test("History is application-scoped, capped and truncates redo branches")
func historyBehavior() {
    var history = ApplicationWindowHistory<String>(limit: 4)
    let frame0 = GlintRect(x: 0, y: 0, width: 100, height: 100)
    let frame1 = GlintRect(x: 10, y: 0, width: 100, height: 100)
    let frame2 = GlintRect(x: 20, y: 0, width: 100, height: 100)
    history.recordMove(applicationID: "app.a", windowID: "window.1", from: frame0, to: frame1)
    history.recordMove(applicationID: "app.a", windowID: "window.2", from: frame0, to: frame2)
    history.recordMove(applicationID: "app.b", windowID: "window.3", from: frame0, to: frame1)

    #expect(history.undo(applicationID: "app.a") == WindowHistoryEntry(windowID: "window.1", frame: frame1))
    #expect(history.undo(applicationID: "app.b") == WindowHistoryEntry(windowID: "window.3", frame: frame0))
    history.recordMove(applicationID: "app.a", windowID: "window.1", from: frame1, to: frame0)
    #expect(history.redo(applicationID: "app.a") == nil)

    for index in 0..<8 {
        let next = GlintRect(x: Double(index * 10), y: 0, width: 100, height: 100)
        history.recordMove(applicationID: "app.a", windowID: "window.1", from: frame0, to: next)
    }
    var undoCount = 0
    while history.undo(applicationID: "app.a") != nil { undoCount += 1 }
    #expect(undoCount == 3)
}

@Test("Quantized adjustment is bounded by two-point steps and the 85 percent floor")
func quantizedPolicy() {
    let policy = QuantizedFramePolicy()
    let requested = GlintRect(x: 0, y: 0, width: 100, height: 100)
    let oversized = GlintRect(x: 0, y: 0, width: 110, height: 106)
    let first = policy.nextAdjustment(requested: requested, proposed: requested, actual: oversized)
    #expect(first == GlintRect(x: 0, y: 0, width: 98, height: 98))

    let floor = GlintRect(x: 0, y: 0, width: 86, height: 86)
    #expect(policy.nextAdjustment(requested: requested, proposed: floor, actual: oversized) == nil)
    #expect(policy.maximumAttempts == 64)
    #expect(policy.timeout == 0.25)
}

@Test("All captured default bindings are unique and mapped")
func shortcutDefaults() throws {
    let defaults = try ShortcutDefault.load()
    #expect(defaults.count == 18)
    #expect(Set(defaults.map(\.binding)).count == 18)
    #expect(defaults.allSatisfy { $0.action != nil && $0.shortcutBinding != nil })
}
