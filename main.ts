#!/usr/bin/env -S deno serve
import { DOMParser } from "jsr:@b-fuze/deno-dom"

const allowedPrefixes = [
  "https://jcbhmr.github.io/",
  "https://jcbhmr.com/",
]

export default {
  async fetch(request) {
    const urlObject = new URL(request.url) as Readonly<URL>;

    if (urlObject.pathname === "/") {
      if (request.method === "HEAD" || request.method === "GET") {
        const baseURLObject = new URL(request.url);
        baseURLObject.search = "";
        return new Response(`refreshredirector
https://github.com/jcbhmr/refreshredirector

Fetches a remote URL (GET method only) and inspects the response to see if it has a 'Refresh: 0; URL=<url>'
HTTP header or a '<meta http-equiv="refresh" content="0; URL=<url>">' HTML <meta> element. If it does,
the server responds with a 301 redirect to the refresh pseudo-redirect URL. Otherwise, the server responds
with a 301 redirect to the original remote URL.

Usage:
  ${baseURLObject}<refresh-url>

Examples:
  ${baseURLObject}https://example.org/http-refresh
  ${baseURLObject}https://example.org/meta-http-equiv-refresh

Allowed prefixes:
  ${allowedPrefixes.join(", ")}
`);
      } else {
        return new Response(null, { status: 405 });
      }
    }
    if (urlObject.pathname === "/favicon.ico") {
      if (request.method === "HEAD" || request.method === "GET") {
        return new Response(null, { status: 404 });
      } else {
        return new Response(null, { status: 405 });
      }
    }
    if (urlObject.pathname === "/robots.txt") {
      if (request.method === "HEAD" || request.method === "GET") {
        return new Response("User-agent: *\nDisallow: /\n");
      } else {
        return new Response(null, { status: 405 });
      }
    }

    if (!(request.method === "HEAD" || request.method === "GET")) {
      return new Response(null, { status: 405 });
    }

    const urlWithoutOrigin = urlObject.href.slice(urlObject.origin.length);

    const remoteURL = URL.parse(urlWithoutOrigin.slice(1)) as Readonly<URL> | null;
    if (!remoteURL) return new Response("not a valid URL", { status: 400 });
    if (remoteURL.protocol !== "https:") return new Response("not an https: URL", { status: 400 });

    if (!allowedPrefixes.some(x => remoteURL.toString().startsWith(x))) return new Response("not an allowed prefix", { status: 400 });

    const defaultResponse = Response.redirect(remoteURL)
    const remoteResponse = await fetch(remoteURL)

    const refresh = remoteResponse.headers.get("Refresh")
    if (refresh) {
      const [refreshDelayRaw, refreshURLRaw] = refresh.split(";url=")

      const refreshDelay = parseFloat(refreshDelayRaw.trim())
      if (Number.isNaN(refreshDelay)) return defaultResponse
      if (refreshDelay !== 0) return defaultResponse

      const refreshURLObject = URL.parse(refreshURLRaw.trim(), remoteResponse.url) as Readonly<URL> | null
      if (!refreshURLObject) return defaultResponse
      if (refreshURLObject.protocol !== "https:") return defaultResponse

      return Response.redirect(refreshURLObject)
    }

    if (!remoteResponse.ok) return defaultResponse

    if (!remoteResponse.body) return defaultResponse

    const contentType = remoteResponse.headers.get("Content-Type")
    if (!contentType) return defaultResponse
    if (!/^\s*text\/html\s*(;|$)/.test(contentType)) return defaultResponse

    const first1024 = new Uint8Array(new ArrayBuffer(0, { maxByteLength: 1024 }))
    const reader = remoteResponse.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (value) {
          const availableByteLength = first1024.buffer.maxByteLength - first1024.byteLength
          if (availableByteLength === 0) break
          first1024.buffer.resize(Math.min(first1024.byteLength + value.byteLength, first1024.buffer.maxByteLength))
          first1024.set(value.subarray(0, availableByteLength), first1024.byteLength)
        }
        if (done) break
      }
    } finally {
      await reader.cancel()
    }

    const text = new TextDecoder().decode(first1024, { stream: true })
    const document = new DOMParser().parseFromString(text, "text/html")

    const metaHttpEquivRefresh = document.querySelector("meta[http-equiv=refresh]")
    if (!metaHttpEquivRefresh) return defaultResponse

    const content = metaHttpEquivRefresh.getAttribute("content")
    if (!content) return defaultResponse

    const [refreshDelayRaw, refreshURLRaw] = content.split(";url=")

    const refreshDelay = parseFloat(refreshDelayRaw.trim())
    if (Number.isNaN(refreshDelay)) return defaultResponse
    if (refreshDelay !== 0) return defaultResponse

    const refreshURLObject = URL.parse(refreshURLRaw.trim(), remoteResponse.url) as Readonly<URL> | null
    if (!refreshURLObject) return defaultResponse
    if (refreshURLObject.protocol !== "https:") return defaultResponse

    return Response.redirect(refreshURLObject)
  },
} satisfies Deno.ServeDefaultExport;
