import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { resolvePublicEmbedOrigin } from "@/lib/agents/public-embed-origin";

const request = (url: string, headers: Record<string, string> = {}) =>
  new Request(url, { headers });

describe("public embed origin", () => {
  test("uses the public localhost port", () => {
    assert.equal(
      resolvePublicEmbedOrigin(request("http://localhost:3000/embed.js", { host: "localhost:3002" })),
      "http://localhost:3002",
    );
  });

  test("preserves different localhost ports", () => {
    assert.equal(
      resolvePublicEmbedOrigin(request("http://localhost:3000/embed.js", { host: "localhost:4173" })),
      "http://localhost:4173",
    );
  });

  test("forwarded host overrides the internal request host", () => {
    assert.equal(
      resolvePublicEmbedOrigin(
        request("http://127.0.0.1:3000/embed.js", {
          host: "127.0.0.1:3000",
          "x-forwarded-host": "qa.example.test",
        }),
      ),
      "https://qa.example.test",
    );
  });

  test("forwarded https protocol is preserved", () => {
    assert.equal(
      resolvePublicEmbedOrigin(
        request("http://127.0.0.1:3000/embed.js", {
          host: "internal:3000",
          "x-forwarded-host": "customer.example.com",
          "x-forwarded-proto": "https",
        }),
      ),
      "https://customer.example.com",
    );
  });

  test("production host defaults safely to HTTPS", () => {
    assert.equal(
      resolvePublicEmbedOrigin(request("http://localhost:3000/embed.js", { host: "customer.example.com" })),
      "https://customer.example.com",
    );
  });

  test("invalid forwarded protocol falls back safely", () => {
    assert.equal(
      resolvePublicEmbedOrigin(
        request("http://localhost:3000/embed.js", {
          host: "localhost:3002",
          "x-forwarded-proto": "ftp",
        }),
      ),
      "http://localhost:3002",
    );
  });

  test("does not fall back to localhost:3000 when public host is 3002", () => {
    const origin = resolvePublicEmbedOrigin(
      request("http://localhost:3000/embed.js", { host: "localhost:3002" }),
    );
    assert.equal(origin.includes("localhost:3000"), false);
  });
});
