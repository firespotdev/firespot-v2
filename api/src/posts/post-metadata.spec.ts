import { fetchPostMetadata, parseSupportedPostUrl } from "./post-metadata";

describe("parseSupportedPostUrl", () => {
  it.each([
    ["https://www.instagram.com/p/ABC123/#comments", "instagram"],
    ["https://instagram.com/reel/C123_xyz/", "instagram"],
    ["https://www.instagram.com/tv/C123-abc/", "instagram"],
    ["https://www.facebook.com/share/p/ABC123/", "facebook"],
    ["https://facebook.com/merchants/posts/9876543210", "facebook"],
    [
      "https://www.facebook.com/permalink.php?story_fbid=123&id=456",
      "facebook",
    ],
    ["https://fb.watch/xyz123/", "facebook"],
    ["https://x.com/firespot/status/123456", "x"],
    ["https://twitter.com/firespot/status/789012", "x"],
    ["https://www.tiktok.com/@firespot/video/7481234567890123456", "tiktok"],
    ["https://www.tiktok.com/@firespot/photo/7481234567890123456", "tiktok"],
    ["https://vm.tiktok.com/ZM123abc/", "tiktok"],
    ["https://vt.tiktok.com/ZS123abc/", "tiktok"],
    ["https://vt.tiktok.com/ZSqR4MbMa/", "tiktok"],
    ["https://www.tiktok.com/t/ZM123abc/", "tiktok"],
  ])("recognises a supported %s link", (sourceUrl, platform) => {
    expect(parseSupportedPostUrl(sourceUrl)).toEqual({
      url: sourceUrl.replace(/#.*$/, ""),
      platform,
    });
  });

  it.each([
    // Vulnerabilities cited in audit
    "https://l.instagram.com/?u=https%3A%2F%2Fevil.example",
    "https://www.facebook.com/login",
    "https://x.com/home",
    // Subdomain redirectors & non-canonical hosts
    "https://lm.facebook.com/l.php?u=https%3A%2F%2Fevil.example",
    "https://t.co/xyz123",
    // Platform home, auth, and non-post pages
    "https://www.instagram.com/explore/",
    "https://instagram.com/accounts/login/",
    "https://www.facebook.com/marketplace",
    "https://www.facebook.com/messages/t/123",
    "https://x.com/explore",
    "https://twitter.com/login",
    "https://x.com/i/flow/login",
    "https://www.tiktok.com/@firespot",
    "https://www.tiktok.com/explore",
    "https://www.tiktok.com/search?q=firespot",
    // Malformed, insecure, or unsupported schemes
    "http://www.instagram.com/p/ABC123",
    "https://example.com/post/ABC123",
    "javascript:alert(1)",
    "https://user:pass@instagram.com/p/ABC123",
  ])("rejects an unsupported or unsafe link: %s", (sourceUrl) => {
    expect(parseSupportedPostUrl(sourceUrl)).toBeNull();
  });
});

describe("fetchPostMetadata", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("resolves TikTok video metadata through the official oEmbed endpoint", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        title: "Fresh stock on TikTok",
        thumbnail_url: "https://p16-sign.tiktokcdn.com/thumbnail.jpeg",
      }),
    }) as jest.Mock;

    const source = parseSupportedPostUrl(
      "https://www.tiktok.com/@firespot/video/7481234567890123456",
    );
    expect(source).not.toBeNull();

    await expect(fetchPostMetadata(source!)).resolves.toEqual({
      title: "Fresh stock on TikTok",
      imageUrl: "https://p16-sign.tiktokcdn.com/thumbnail.jpeg",
      siteName: "TikTok",
      extractionStatus: "success",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: "www.tiktok.com",
        pathname: "/oembed",
        searchParams: expect.any(URLSearchParams),
      }),
      expect.objectContaining({
        headers: { accept: "application/json" },
      }),
    );
  });

  it("gets a photo-post thumbnail from the public page when oEmbed has none", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ title: "TikTok photo post" }),
      })
      .mockResolvedValueOnce(
        new Response(
          '<html><head><meta property="og:image" content="https://p16-sign.tiktokcdn.com/photo.jpeg"></head></html>',
          {
            status: 200,
            headers: { "content-type": "text/html" },
          },
        ),
      ) as jest.Mock;

    const source = parseSupportedPostUrl(
      "https://www.tiktok.com/@firespot/photo/7481234567890123456",
    );

    await expect(fetchPostMetadata(source!)).resolves.toEqual({
      title: "TikTok photo post",
      description: undefined,
      imageUrl: "https://p16-sign.tiktokcdn.com/photo.jpeg",
      siteName: "TikTok",
      extractionStatus: "success",
    });
  });

  it("resolves a short TikTok photo link through its crawler metadata", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: {
            location:
              "https://www.tiktok.com/@erickstephenngulube/photo/7680268068370648327",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          '<html><head><meta property="og:title" content="TikTok · Erick"><meta property="og:image" content="https://p16-sharing-sign.tiktokcdn.com/photo.jpeg"></head></html>',
          {
            status: 200,
            headers: { "content-type": "text/html" },
          },
        ),
      ) as jest.Mock;

    const source = parseSupportedPostUrl("https://vt.tiktok.com/ZSqR4MbMa/");

    await expect(fetchPostMetadata(source!)).resolves.toEqual({
      title: "TikTok · Erick",
      description: undefined,
      imageUrl: "https://p16-sharing-sign.tiktokcdn.com/photo.jpeg",
      siteName: undefined,
      extractionStatus: "success",
    });
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      "https://www.tiktok.com/@erickstephenngulube/photo/7680268068370648327",
      expect.objectContaining({
        headers: expect.objectContaining({
          "user-agent": expect.stringContaining("facebookexternalhit"),
        }),
      }),
    );
  });
});
