#!/usr/bin/env -S deno serve --allow-net
import { DOMParser } from "jsr:@b-fuze/deno-dom";
import { parseMediaType } from "jsr:@std/media-types";
import { arrayBuffer } from "node:stream/consumers";
import { LimitedReadableStream } from "./limit_stream.ts";
import { parseRefresh } from "./refresh.ts";
import * as HTML from "@std/html";

export default {
  async fetch(request) {
    const urlObject = new URL(request.url) as Readonly<URL>;
    const pathQuery = urlObject.pathname + urlObject.search;

    function rvError(bodyText: string, status: number): Response {
      const bodyBlob = new Blob([bodyText], {
        type: "text/plain; charset=utf-8",
      });
      return new Response(bodyBlob, { status: status });
    }

    if (!(request.method === "GET" || request.method === "HEAD")) {
      return rvError(
        `Method '${request.method}' not allowed. Expected 'GET' or 'HEAD'`,
        405,
      );
    }

    const targetURL = pathQuery.slice(1);
    const targetURLObject = URL.parse(targetURL) as Readonly<URL>;
    if (!targetURLObject) {
      return rvError(`Could not parse '${targetURL}' as an absolute URL`, 400);
    }

    if (targetURLObject.protocol !== "https:") {
      return rvError(
        `Target URL must be 'https:'. Got '${targetURLObject.protocol}'`,
        400,
      );
    }

    let targetResponse: Response;
    try {
      targetResponse = await fetch(targetURL, { redirect: "manual" });
    } catch (error) {
      return rvError(`Fetching ${targetURL} failed: ${error}`, 502);
    }

    function rvRedirect(
      bodyText: string,
      url: string,
      status: number = 301,
    ): Response {
      const bodyBlob = new Blob([bodyText], {
        type: "text/plain; charset=utf-8",
      });
      return new Response(bodyBlob, {
        status: status,
        headers: { "Location": url },
      });
    }

    let first1024: ArrayBuffer;
    try {
      if (targetResponse.status !== 200) {
        return rvRedirect(
          `${targetResponse.url} not OK. Got ${targetResponse.status}`,
          targetURL,
          302,
        );
      }

      if (!targetResponse.body) {
        return rvRedirect(`${targetURL} has no body`, targetURL, 302);
      }

      const contentType = targetResponse.headers.get("Content-Type");
      if (!contentType) {
        return rvRedirect(
          `${targetURL} has no 'Content-Type' header`,
          targetURL,
          302,
        );
      }

      let mediaType: string;
      try {
        [mediaType] = parseMediaType(contentType);
      } catch (error) {
        return rvRedirect(
          `Could not parse '${contentType}' as a media type: ${error}`,
          targetURL,
          302,
        );
      }

      if (mediaType !== "text/html") {
        return rvRedirect(
          `${targetURL} is not text/html. Got ${mediaType}`,
          targetURL,
          302,
        );
      }

      const first1024Readable = targetResponse.body.pipeThrough(
        new LimitedReadableStream(1024),
      );
      try {
        first1024 = await arrayBuffer(first1024Readable);
      } catch (error) {
        return rvRedirect(
          `Could not read first 1024 bytes of ${targetURL}: ${error}`,
          targetURL,
          302,
        );
      }
    } finally {
      try {
        await targetResponse.body?.cancel();
      } catch {
        // Ignore cancellation errors.
      }
    }

    const text = new TextDecoder().decode(first1024, { stream: true });
    const document = new DOMParser().parseFromString(text, "text/html");

    const metaRefresh = document.querySelector("meta[http-equiv='refresh']");
    if (!metaRefresh) {
      return rvRedirect(
        `No <meta http-equiv='refresh'> found in ${targetURL}`,
        targetURL,
        302,
      );
    }

    const metaRefreshContent = metaRefresh.getAttribute("content");
    if (!metaRefreshContent) {
      return rvRedirect(
        `No 'content' attribute found in <meta http-equiv='refresh'> in ${targetURL}`,
        targetURL,
        302,
      );
    }

    let refresh: { delay: number; url: string | null };
    try {
      refresh = parseRefresh(metaRefreshContent, targetURLObject);
    } catch (error) {
      return rvRedirect(
        `Could not parse Refresh '${metaRefreshContent}': ${error}`,
        targetURL,
        302,
      );
    }

    if (refresh.delay !== 0) {
      return rvRedirect(
        `Refresh delay must be 0. Got ${refresh.delay}`,
        targetURL,
        302,
      );
    }

    if (refresh.url == null) {
      return rvRedirect(`Refresh URL must be present`, targetURL, 302);
    }

    return new Response(
      new Blob([
        `Moved to <a href="${HTML.escape(refresh.url)}">${
          HTML.escape(refresh.url)
        }</a>`,
      ], { type: "text/html; charset=utf-8" }),
      {
        status: 302,
        headers: { "Location": refresh.url },
      },
    );
  },
} satisfies Deno.ServeDefaultExport;
