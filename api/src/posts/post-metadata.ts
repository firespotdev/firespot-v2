import type { PostPlatform } from "../schemas/post.schema";

export interface PostPreviewMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  extractionStatus?: "success" | "failed" | "partial";
}

export interface SupportedPostUrl {
  url: string;
  platform: PostPlatform;
}

const CANONICAL_PLATFORM_HOSTS: Record<PostPlatform, string[]> = {
  instagram: ["instagram.com", "www.instagram.com"],
  facebook: [
    "facebook.com",
    "www.facebook.com",
    "m.facebook.com",
    "web.facebook.com",
    "fb.watch",
  ],
  x: [
    "x.com",
    "www.x.com",
    "twitter.com",
    "www.twitter.com",
    "mobile.twitter.com",
  ],
  tiktok: [
    "tiktok.com",
    "www.tiktok.com",
    "m.tiktok.com",
    "vm.tiktok.com",
    "vt.tiktok.com",
  ],
};

const MAX_HTML_BYTES = 64 * 1024; // 64KB is sufficient for <head> and OpenGraph metadata
const TIKTOK_PREVIEW_USER_AGENT =
  "facebookexternalhit/1.1 (+https://www.facebook.com/externalhit_uatext.php)";

const readAttribute = (tag: string, name: string) => {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3];
};

const decodeHtmlEntities = (value: string) =>
  value.replace(
    /&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi,
    (_, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower === "amp") return "&";
      if (lower === "lt") return "<";
      if (lower === "gt") return ">";
      if (lower === "quot") return '"';
      if (lower === "apos") return "'";
      if (lower === "nbsp") return " ";

      const code = lower.startsWith("#x")
        ? Number.parseInt(lower.slice(2), 16)
        : Number.parseInt(lower.slice(1), 10);
      try {
        return Number.isFinite(code) ? String.fromCodePoint(code) : "";
      } catch {
        return "";
      }
    },
  );

const cleanValue = (value: string | undefined, maxLength: number) => {
  const cleaned = value ? decodeHtmlEntities(value).trim() : "";
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
};

const extractionStatusFor = (
  title?: string,
  description?: string,
  imageUrl?: string,
): NonNullable<PostPreviewMetadata["extractionStatus"]> => {
  if (imageUrl && (title || description)) return "success";
  if (imageUrl || title || description) return "partial";
  return "failed";
};

function isValidPostPath(
  platform: PostPlatform,
  hostname: string,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  if (platform === "instagram") {
    // /p/ID/, /reel/ID/, /reels/ID/, /tv/ID/
    return /^\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?$/.test(pathname);
  }

  if (platform === "x") {
    // /username/status/123456
    return /^\/[A-Za-z0-9_]{1,15}\/status\/[0-9]+\/?$/.test(pathname);
  }

  if (platform === "tiktok") {
    if (hostname === "vm.tiktok.com" || hostname === "vt.tiktok.com") {
      return /^\/[A-Za-z0-9_-]+\/?$/.test(pathname);
    }
    // /@username/video/123456, /@username/photo/123456, or /t/ABC123
    return (
      /^\/@[A-Za-z0-9._-]+\/(video|photo)\/[0-9]+\/?$/.test(pathname) ||
      /^\/t\/[A-Za-z0-9_-]+\/?$/.test(pathname)
    );
  }

  if (platform === "facebook") {
    if (hostname === "fb.watch") {
      return /^\/[A-Za-z0-9_-]+\/?$/.test(pathname);
    }
    // /{user}/posts/{id}
    if (/^\/[A-Za-z0-9.]+\/posts\/[A-Za-z0-9_-]+\/?$/.test(pathname)) {
      return true;
    }
    // /{user}/videos/{id}
    if (/^\/[A-Za-z0-9.]+\/videos\/[0-9]+\/?$/.test(pathname)) {
      return true;
    }
    // /permalink.php?story_fbid=...
    if (pathname === "/permalink.php" && searchParams.has("story_fbid")) {
      return true;
    }
    // /photo.php?fbid=... or /photo/?fbid=...
    if (
      (pathname === "/photo.php" ||
        pathname === "/photo" ||
        pathname === "/photo/") &&
      searchParams.has("fbid")
    ) {
      return true;
    }
    // /watch/?v=...
    if (
      (pathname === "/watch" || pathname === "/watch/") &&
      searchParams.has("v")
    ) {
      return true;
    }
    // /reel/{id}
    if (/^\/reel\/[0-9]+\/?$/.test(pathname)) {
      return true;
    }
    // /share/p/{id}, /share/r/{id}, /share/v/{id}
    if (/^\/share\/(p|r|v)\/[A-Za-z0-9_-]+\/?$/.test(pathname)) {
      return true;
    }
    return false;
  }

  return false;
}

export function parseSupportedPostUrl(
  sourceUrl: string,
): SupportedPostUrl | null {
  let url: URL;
  try {
    url = new URL(sourceUrl.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.username || url.password) return null;

  const hostname = url.hostname.toLowerCase();

  for (const [platform, hosts] of Object.entries(
    CANONICAL_PLATFORM_HOSTS,
  ) as Array<[PostPlatform, string[]]>) {
    if (hosts.includes(hostname)) {
      if (isValidPostPath(platform, hostname, url.pathname, url.searchParams)) {
        url.hash = "";
        return { url: url.toString(), platform };
      }
      return null;
    }
  }

  return null;
}

const parseMetadata = (html: string, finalUrl: string): PostPreviewMetadata => {
  const values = new Map<string, string>();
  const tags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of tags) {
    const key = (
      readAttribute(tag, "property") ||
      readAttribute(tag, "name") ||
      ""
    ).toLowerCase();
    const content = readAttribute(tag, "content");
    if (key && content && !values.has(key)) values.set(key, content);
  }

  const title = cleanValue(
    values.get("og:title") ||
      values.get("twitter:title") ||
      html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1],
    200,
  );
  const description = cleanValue(
    values.get("og:description") ||
      values.get("twitter:description") ||
      values.get("description"),
    1000,
  );
  const imageValue = values.get("og:image") || values.get("twitter:image");
  let imageUrl: string | undefined;
  if (imageValue) {
    try {
      const image = new URL(decodeHtmlEntities(imageValue), finalUrl);
      if (image.protocol === "https:")
        imageUrl = image.toString().slice(0, 2048);
    } catch {
      imageUrl = undefined;
    }
  }

  const siteName = cleanValue(values.get("og:site_name"), 120);

  return {
    title,
    description,
    imageUrl,
    siteName,
    extractionStatus: extractionStatusFor(title, description, imageUrl),
  };
};

const readHtmlStream = async (response: Response): Promise<string> => {
  if (!response.body) {
    const text = await response.text();
    return text.slice(0, MAX_HTML_BYTES);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let html = "";
  let bytesRead = 0;

  try {
    while (bytesRead < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        bytesRead += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (html.toLowerCase().includes("</head>")) {
          break;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  return html;
};

const fetchTikTokMetadata = async (
  source: SupportedPostUrl,
): Promise<PostPreviewMetadata | null> => {
  const endpoint = new URL("https://www.tiktok.com/oembed");
  endpoint.searchParams.set("url", source.url);

  const response = await fetch(endpoint, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;

  const data = (await response.json()) as Record<string, unknown>;
  const title = cleanValue(
    typeof data.title === "string" ? data.title : undefined,
    200,
  );
  const thumbnailValue =
    typeof data.thumbnail_url === "string" ? data.thumbnail_url : undefined;
  let imageUrl: string | undefined;
  if (thumbnailValue) {
    try {
      const image = new URL(thumbnailValue);
      if (image.protocol === "https:") {
        imageUrl = image.toString().slice(0, 2048);
      }
    } catch {
      imageUrl = undefined;
    }
  }

  if (!title && !imageUrl) return null;

  return {
    title,
    imageUrl,
    siteName: "TikTok",
    extractionStatus: extractionStatusFor(title, undefined, imageUrl),
  };
};

const fetchHtml = async (source: SupportedPostUrl) => {
  let currentUrl = source.url;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(currentUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent":
          source.platform === "tiktok"
            ? TIKTOK_PREVIEW_USER_AGENT
            : "FirespotBot/1.0 (+https://firespot.co)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      const targetAbsolute = new URL(location, currentUrl).toString();
      const redirected = parseSupportedPostUrl(targetAbsolute);
      if (!redirected) return null;
      currentUrl = redirected.url;
      continue;
    }

    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.toLowerCase().includes("text/html"))
      return null;

    const html = await readHtmlStream(response);
    return { html, finalUrl: currentUrl };
  }

  return null;
};

export async function fetchPostMetadata(
  source: SupportedPostUrl,
): Promise<PostPreviewMetadata> {
  try {
    let tiktokMetadata: PostPreviewMetadata | null = null;
    if (source.platform === "tiktok") {
      try {
        tiktokMetadata = await fetchTikTokMetadata(source);
        if (tiktokMetadata?.imageUrl) return tiktokMetadata;
      } catch {
        // Fall through to TikTok's public page metadata.
      }
    }

    const fetched = await fetchHtml(source);
    if (!fetched) {
      return tiktokMetadata || { extractionStatus: "failed" };
    }
    const pageMetadata = parseMetadata(fetched.html, fetched.finalUrl);
    if (!tiktokMetadata) return pageMetadata;

    const merged = {
      title: tiktokMetadata.title || pageMetadata.title,
      description: pageMetadata.description,
      imageUrl: pageMetadata.imageUrl,
      siteName: "TikTok",
    };
    return {
      ...merged,
      extractionStatus: extractionStatusFor(
        merged.title,
        merged.description,
        merged.imageUrl,
      ),
    };
  } catch {
    return { extractionStatus: "failed" };
  }
}
