import Cocoa

signal(SIGTERM) { _ in exit(0) }
signal(SIGINT) { _ in exit(0) }

NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown]) { event in
    let loc = NSEvent.mouseLocation
    if let primary = NSScreen.screens.first {
        // Convert from macOS bottom-left origin to top-left origin
        let y = primary.frame.maxY - loc.y
        let line = "\(loc.x),\(y)\n"
        if let data = line.data(using: .utf8) {
            FileHandle.standardOutput.write(data)
        }
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
app.run()
