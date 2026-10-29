package com.twistedtac.board

/**
 * Camera presets from src/utils/cameraPresets.ts. The web stores CSS
 * rotateX/rotateY degrees; here pitch is the negated rotateX so that a
 * positive pitch tips the top of the board toward the viewer.
 */
enum class CameraPreset(val label: String, val shortLabel: String, val pitch: Double, val yaw: Double) {
    TOP("Top view", "T", 90.0, 0.0),
    FRONT("Front view", "F", 0.0, 0.0),
    RIGHT("Right view", "R", 0.0, 90.0),
    BACK("Back view", "B", 0.0, 180.0),
    LEFT("Left view", "L", 0.0, -90.0),
    ISO("Isometric view", "I", 35.0, 45.0),
    HOME("Home view", "⌂", 25.0, 45.0),
}
