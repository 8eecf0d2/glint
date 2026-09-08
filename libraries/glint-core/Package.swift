// swift-tools-version: 6.0
import PackageDescription
let package = Package(
    name: "GlintCore",
    platforms: [.macOS(.v14)],
    products: [.library(name: "GlintCore", targets: ["GlintCore"])],
    targets: [
        .target(name: "GlintCore", resources: [.process("Resources")]),
        .testTarget(name: "GlintCoreTests", dependencies: ["GlintCore"], resources: [.copy("Fixtures")]),
    ]
)
