---
name: Apple Shortcut capture
description: Product constraints for future iPhone Shortcut and Back Tap integration.
---

TapLedger's Back Tap Shortcut should prefill the existing expense form with untrusted draft data and require the user to review and confirm before saving. Never put credentials in a URL or frontend bundle. Future screenshot processing must use an image the user explicitly selected or a capture iOS permits; do not claim a normal website can take unrestricted background screenshots of other apps.

**Why:** The user wants Shortcut-assisted expense capture without accidental or unverified transactions. The current app stays local-only; the URL is a prefill handoff, not an authenticated API.

**How to apply:** Keep URL, Shortcut, and any future AI/OCR capture on the same review-draft path. Require explicit confirmation before local persistence; put any future service credentials on the server and describe iOS capture limitations accurately.
