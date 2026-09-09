Glint 0.1.1 improves the native Settings experience and development workflow.

- Simplified menu bar menu; removed positioning menu items and pause functionality. All 18 keyboard commands remain available.
- Refined Settings layout, compact spacing and fading title-bar blur. Glint appears in the Dock while Settings is open.
- Added inline version, Open folder and Check for updates controls, plus a clear Accessibility status.
- Settings now supports window positioning, resizing and undo/redo with Glint shortcuts. Window commands are suspended while recording a shortcut and restored when recording ends.
- Local development now automatically reuses a free persistent signing identity and safely replaces a fixed installed copy.

This archive targets Apple silicon (arm64), with macOS 14 as the build minimum. Fresh-machine installation and the supported-OS acceptance matrix remain pending. Intel is not included.

The public app is ad-hoc signed, without Apple Developer ID signing or notarization. Local development signing is separate and does not change public-release trust. Public updates may require renewed Accessibility approval. See INSTALL.md for installation and recovery. Updates are checked on request and never installed automatically.

Glint is licensed under Apache 2.0. Spectacle attribution is included in THIRD_PARTY_NOTICES.md.
