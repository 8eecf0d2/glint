import AppKit
import Foundation

// Install only after a successful staged build and a graceful app shutdown.
guard CommandLine.arguments.count == 3 else {
    fputs("Usage: install-development.swift staged-app destination-app\n", stderr)
    exit(1)
}
let source = URL(fileURLWithPath: CommandLine.arguments[1])
let destination = URL(fileURLWithPath: CommandLine.arguments[2])
guard source.standardizedFileURL != destination.standardizedFileURL,
      Bundle(url: source)?.bundleIdentifier == "dev.8eecf0d2.glint" else {
    fputs("Expected a separate, staged Glint app bundle.\n", stderr)
    exit(1)
}
let running = NSRunningApplication.runningApplications(withBundleIdentifier: "dev.8eecf0d2.glint")
for app in running { app.terminate() }
let deadline = Date().addingTimeInterval(15)
while running.contains(where: { !$0.isTerminated }) && Date() < deadline {
    RunLoop.current.run(until: Date().addingTimeInterval(0.1))
}
guard running.allSatisfy({ $0.isTerminated }) else {
    fputs("Glint did not quit; installed app was not replaced.\n", stderr)
    exit(1)
}
let files = FileManager.default
try files.createDirectory(at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
let incoming = destination.deletingLastPathComponent().appendingPathComponent(".Glint-\(UUID().uuidString).app")
try files.copyItem(at: source, to: incoming)
if files.fileExists(atPath: destination.path) {
    _ = try files.replaceItemAt(destination, withItemAt: incoming)
} else {
    try files.moveItem(at: incoming, to: destination)
}
let process = Process()
process.executableURL = URL(fileURLWithPath: "/usr/bin/open")
process.arguments = [destination.path, "--args", "--settings"]
try process.run()
process.waitUntilExit()
print("Development app: \(destination.path)")
exit(process.terminationStatus)
