// swift-tools-version: 6.0
import PackageDescription
let package = Package(
    name: "GlintDesktop",
    platforms: [.macOS(.v14)],
    products: [.executable(name: "Glint", targets: ["Glint"])],
    dependencies: [.package(path: "../../libraries/glint-core")],
    targets: [.executableTarget(name: "Glint", dependencies: [.product(name: "GlintCore", package: "glint-core")])]
)
