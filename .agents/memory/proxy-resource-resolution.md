---
name: Proxy resource resolution
description: Durable rules for keeping nested resources and runtime network calls inside the Island Dream proxy.
---

Resolve relative URLs against the original upstream document URL before wrapping them in the proxy. Carry the active ad, redirect, and popup profile into every nested proxy URL.

**Why:** A proxied document's browser-visible URL is the proxy endpoint, so naïve relative fetch/XHR resolution targets the local API path instead of the original site. Nested resources also need the same protection behavior as the top-level page.

**How to apply:** Keep HTML attributes, CSS `url()`, dynamic DOM insertions, fetch, and XHR aligned with the upstream base URL. Treat CSS as rewriteable content, and remember that arbitrary JavaScript-generated WebSockets, browser DRM, and opaque cross-origin behavior cannot be made fully transparent by an HTTP HTML proxy.