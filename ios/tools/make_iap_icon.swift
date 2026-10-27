import AppKit
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// The 1024x1024 image for the "Larger Boards" in-app purchase, in the same style
// as the app icon: glowing rounded blocks on the dark navy gradient.
//
//   * a big 5x5 board, mid-game          -> larger boards, and flat 2D boards
//   * glass layer plates stacked behind   -> bigger 3D cubes
//   * a teal globe badge                  -> hosting games online
//
// Usage: swift tools/make_iap_icon.swift AppStore/iap-larger-boards-1024.png

let size = 1024
let orange = NSColor(red: 1.0, green: 0.388, blue: 0.2, alpha: 1)     // brand #ff6333
let teal = NSColor(red: 0.231, green: 0.910, blue: 0.878, alpha: 1)    // Theme.playerO #3be8e0
let navy = (r: 0.040, g: 0.055, b: 0.082)                               // app icon background
let navyColor = NSColor(red: navy.r, green: navy.g, blue: navy.b, alpha: 1)

let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
                           samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                           colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
let ctx = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.current = ctx
let cg = ctx.cgContext
let space = CGColorSpaceCreateDeviceRGB()
// Work in top-left coordinates.
cg.translateBy(x: 0, y: CGFloat(size))
cg.scaleBy(x: 1, y: -1)

// Background: the same gradient as the app icon.
let top = CGColor(red: navy.r + 0.03, green: navy.g + 0.04, blue: navy.b + 0.06, alpha: 1)
let bottom = CGColor(red: navy.r, green: navy.g, blue: navy.b, alpha: 1)
let gradient = CGGradient(colorsSpace: space, colors: [top, bottom] as CFArray, locations: [0, 1])!
cg.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: 0, y: CGFloat(size)), options: [])

func block(_ rect: CGRect, radius: CGFloat, color: NSColor, glow: CGFloat = 0) {
    cg.saveGState()
    if glow > 0 { cg.setShadow(offset: .zero, blur: glow, color: color.withAlphaComponent(0.55).cgColor) }
    color.setFill()
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
    cg.restoreGState()
}

// Layout: the board and its two plates fit a 628pt square, centred on the canvas.
let cell: CGFloat = 96, gap: CGFloat = 16
let boardSide = 5 * cell + 4 * gap                  // 544
let step: CGFloat = 42                              // how far each plate peeks out up and left
let boardX = (CGFloat(size) - (boardSide + 2 * step)) / 2 + 2 * step
let boardY = boardX

// Glass plates behind the board: the 3D layers.
for layer in [2, 1] {
    let inset = CGFloat(layer) * step
    let rect = CGRect(x: boardX - inset, y: boardY - inset, width: boardSide, height: boardSide)
    let path = NSBezierPath(roundedRect: rect, xRadius: 44, yRadius: 44)
    NSColor(white: 1, alpha: 0.035).setFill()
    path.fill()
    orange.withAlphaComponent(layer == 1 ? 0.7 : 0.4).setStroke()
    path.lineWidth = 8
    path.stroke()
}

// The front board. Orange marks run down the diagonal, with two teal replies.
let teals: Set<[Int]> = [[0, 2], [2, 0]]
let plateRect = CGRect(x: boardX - 24, y: boardY - 24, width: boardSide + 48, height: boardSide + 48)
let backing = NSBezierPath(roundedRect: plateRect, xRadius: 52, yRadius: 52)
navyColor.withAlphaComponent(0.92).setFill()
backing.fill()
for row in 0..<5 {
    for col in 0..<5 {
        let rect = CGRect(x: boardX + CGFloat(col) * (cell + gap), y: boardY + CGFloat(row) * (cell + gap),
                          width: cell, height: cell)
        if row == col {
            block(rect, radius: 20, color: orange, glow: 56)
        } else if teals.contains([row, col]) {
            block(rect, radius: 20, color: teal, glow: 48)
        } else {
            block(rect, radius: 20, color: NSColor(white: 1, alpha: 0.09))
        }
    }
}

// Globe badge, lower right: the online part.
let globeRadius: CGFloat = 118
let globeCenter = CGPoint(x: boardX + boardSide - 6, y: boardY + boardSide - 6)
navyColor.setFill()
NSBezierPath(ovalIn: CGRect(x: globeCenter.x - globeRadius - 34, y: globeCenter.y - globeRadius - 34,
                            width: (globeRadius + 34) * 2, height: (globeRadius + 34) * 2)).fill()

cg.saveGState()
cg.setShadow(offset: .zero, blur: 50, color: teal.withAlphaComponent(0.55).cgColor)
teal.setStroke()
func stroke(_ path: NSBezierPath, _ width: CGFloat) {
    path.lineWidth = width
    path.lineCapStyle = .round
    path.stroke()
}
let g = globeCenter, r = globeRadius
stroke(NSBezierPath(ovalIn: CGRect(x: g.x - r, y: g.y - r, width: 2 * r, height: 2 * r)), 22)      // rim
stroke(NSBezierPath(ovalIn: CGRect(x: g.x - r * 0.46, y: g.y - r, width: r * 0.92, height: 2 * r)), 16) // meridian
let equator = NSBezierPath()
equator.move(to: CGPoint(x: g.x - r, y: g.y)); equator.line(to: CGPoint(x: g.x + r, y: g.y))
stroke(equator, 16)
for offset in [-0.52, 0.52] {                                                                         // latitudes
    let lat = NSBezierPath()
    let half = r * sqrt(1 - offset * offset)
    lat.move(to: CGPoint(x: g.x - half, y: g.y + r * offset)); lat.line(to: CGPoint(x: g.x + half, y: g.y + r * offset))
    stroke(lat, 14)
}
cg.restoreGState()

// Flatten into RGB with no alpha channel (the App Store rejects transparency).
let flat = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
                     space: space, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
flat.draw(rep.cgImage!, in: CGRect(x: 0, y: 0, width: size, height: size))
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: CommandLine.arguments[1]) as CFURL,
                                           UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, flat.makeImage()!, nil)
precondition(CGImageDestinationFinalize(dest))
print("wrote \(CommandLine.arguments[1])")
