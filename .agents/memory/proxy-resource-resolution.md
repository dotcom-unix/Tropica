---
name: Proxy resource resolution
description: Durable rules for keeping nested resources and runtime network calls inside the Island Dream proxy.
---

Resolve relative URLs against the original upstream document URL before wrapping them in the proxy. Carry the active ad, redirect, and popup profile into every nested proxy URL.

**Why:** A proxied document's browser-visible URL is the proxy endpoint, so naïve relative fetch/XHR resolution targets the local API path instead of the original site. Nested resources also need the same protection behavior as the top-level page.

**How to apply:** Keep HTML attributes, CSS `url()`, dynamic DOM insertions, fetch, and XHR aligned with the upstream base URL. Treat CSS as rewriteable content, and remember that arbitrary JavaScript-generated WebSockets, browser DRM, and opaque cross-origin behavior cannot be made fully transparent by an HTTP HTML proxy.

Browser-visible metadata and helper assets should also use Island Dream endpoints. In particular, never expose a third-party favicon service directly to the browser; fetch favicons server-side through the local API.