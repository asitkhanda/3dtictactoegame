// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "TwistedTacKit",
    platforms: [.iOS(.v26), .macOS(.v26)],
    products: [
        .library(name: "TwistedTacKit", targets: ["TwistedTacKit"]),
    ],
    targets: [
        .target(name: "TwistedTacKit"),
        .testTarget(
            name: "TwistedTacKitTests",
            dependencies: ["TwistedTacKit"],
            resources: [.copy("Resources/parity-vectors.json")]
        ),
    ]
)
