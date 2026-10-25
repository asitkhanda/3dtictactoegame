import AppKit
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// Brand mark rectangles from public/favicon.svg (viewBox 108.89 x 108.89, y down).
let rects: [(Double, Double, Double, Double)] = [
    (18.15, 0, 18.15, 18.15), (18.15, 36.3, 18.15, 36.3), (18.15, 90.74, 18.15, 18.15),
    (72.6, 0, 18.15, 18.15), (72.6, 36.3, 18.15, 36.3), (72.6, 90.74, 18.15, 18.15),
    (0, 18.15, 18.15, 18.15), (36.3, 18.15, 36.3, 18.15), (90.74, 18.15, 18.15, 18.15),
    (0, 72.6, 18.15, 18.15), (36.3, 72.6, 36.3, 18.15), (90.74, 72.6, 18.15, 18.15),
]

func render(path: String, background: (CGFloat, CGFloat, CGFloat)?, glow: Bool, glyph: NSColor) {
    let size = 1024
    // The App Store rejects icons with an alpha channel, so opaque icons are RGB only.
    let opaque = background != nil
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    let ctx = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.current = ctx
    let cg = ctx.cgContext
    let space = CGColorSpaceCreateDeviceRGB()

    if let bg = background {
        let top = CGColor(red: bg.0 + 0.03, green: bg.1 + 0.04, blue: bg.2 + 0.06, alpha: 1)
        let bottom = CGColor(red: bg.0, green: bg.1, blue: bg.2, alpha: 1)
        let gradient = CGGradient(colorsSpace: space, colors: [top, bottom] as CFArray, locations: [0, 1])!
        cg.drawLinearGradient(gradient, start: CGPoint(x: 0, y: CGFloat(size)), end: .zero, options: [])
    }

    let glyphSize = Double(size) * 0.58
    let scale = glyphSize / 108.89
    let origin = (Double(size) - glyphSize) / 2

    func drawGlyph(color: NSColor) {
        color.setFill()
        for (x, y, w, h) in rects {
            let flippedY = 108.89 - y - h
            NSBezierPath(roundedRect: NSRect(x: origin + x * scale, y: origin + flippedY * scale,
                                             width: w * scale, height: h * scale),
                         xRadius: 3 * scale, yRadius: 3 * scale).fill()
        }
    }
    if glow {
        cg.saveGState()
        cg.setShadow(offset: .zero, blur: 60, color: glyph.withAlphaComponent(0.55).cgColor)
        drawGlyph(color: glyph)
        cg.restoreGState()
    }
    drawGlyph(color: glyph)

    if opaque {
        // Re-draw into a context with no alpha channel so the PNG is plain RGB.
        let flat = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
                             space: space, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
        flat.draw(rep.cgImage!, in: CGRect(x: 0, y: 0, width: size, height: size))
        let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil)!
        CGImageDestinationAddImage(dest, flat.makeImage()!, nil)
        precondition(CGImageDestinationFinalize(dest))
    } else {
        try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
    }
}

let dir = CommandLine.arguments[1]
let orange = NSColor(red: 1.0, green: 0.388, blue: 0.2, alpha: 1)   // #ff6333
render(path: "\(dir)/icon-1024.png", background: (0.040, 0.055, 0.082), glow: true, glyph: orange)
render(path: "\(dir)/icon-dark-1024.png", background: nil, glow: true, glyph: orange)       // transparent: iOS draws the dark plate
render(path: "\(dir)/icon-tinted-1024.png", background: (0, 0, 0), glow: false, glyph: NSColor(white: 0.92, alpha: 1))
print("icons written")
