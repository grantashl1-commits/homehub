import { describe, expect, it } from "vitest";
import { CHUNK, clampRange } from "../../api/slideshow-media";

describe("clampRange", () => {
  it("sends the whole file when the browser doesn't ask for a range (photos)", () => {
    expect(clampRange(null)).toBeNull();
  });

  it("caps an open-ended video range to one chunk", () => {
    expect(clampRange("bytes=0-")).toEqual({ start: 0, end: CHUNK - 1 });
    expect(clampRange("bytes=10000000-")).toEqual({ start: 10_000_000, end: 10_000_000 + CHUNK - 1 });
  });

  it("keeps a small range as asked", () => {
    expect(clampRange("bytes=0-1")).toEqual({ start: 0, end: 1 });
    expect(clampRange("bytes=500-999")).toEqual({ start: 500, end: 999 });
  });

  it("caps a large explicit range", () => {
    expect(clampRange(`bytes=0-${CHUNK * 3}`)).toEqual({ start: 0, end: CHUNK - 1 });
  });
});

describe("GET /api/slideshow-media", () => {
  it("asks Drive for one chunk and replies 206 with the range", async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    process.env.HUB_ACCESS_KEY = "test-key";
    vi.doMock("../../api/_google.js", () => ({ driveToken: async () => "tok" }));
    const seen: Record<string, string>[] = [];
    vi.stubGlobal("fetch", async (_u: string | URL | Request, init?: RequestInit) => {
      seen.push(init?.headers as Record<string, string>);
      return new Response("x".repeat(10), {
        status: 206,
        headers: { "content-type": "video/mp4", "content-range": `bytes 0-${CHUNK - 1}/20000000`, "content-length": "10" },
      });
    });
    const { signMediaUrl } = await import("../../api/_shared");
    const { GET } = await import("../../api/slideshow-media");
    const res = await GET(new Request(`https://hub.test${signMediaUrl("file1")}`, { headers: { range: "bytes=0-" } }));
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe(`bytes 0-${CHUNK - 1}/20000000`);
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(seen[0].range).toBe(`bytes=0-${CHUNK - 1}`);
    vi.unstubAllGlobals();
  });
});
