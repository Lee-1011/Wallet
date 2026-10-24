---
name: Apple Shortcut capture
description: Product constraints for future iPhone Shortcut and Back Tap integration.
---

TapLedger's future Back Tap flow should let the user explicitly capture a payment confirmation and send structured transaction data through a secure API. Do not implement screenshot recognition or AI extraction until requested, and do not claim iOS permits unrestricted background screenshots of other apps.

**Why:** The user wants a future Shortcut-assisted entry flow, but the first version must remain local-only and avoid unsupported iOS screenshot assumptions.

**How to apply:** Keep future Shortcut work separate from local storage, require explicit user action and a secure API, and describe iOS capture limitations accurately.
