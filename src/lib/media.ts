const IMAGE_EXT = /\.(avif|gif|jpe?g|png|webp|svg)(\?|#|$)/i;
const AUDIO_EXT = /\.(aac|flac|m4a|mp3|ogg|wav|webm)(\?|#|$)/i;
const VIDEO_EXT = /\.(m4v|mov|mp4|webm)(\?|#|$)/i;

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isMediaRef(value: string) {
  return isHttpUrl(value) || value.startsWith("/");
}

export function parseMediaUrls(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function looksLikeImage(url: string) {
  return IMAGE_EXT.test(url);
}

export function looksLikeAudio(url: string) {
  return AUDIO_EXT.test(url);
}

export function looksLikeVideo(url: string) {
  return VIDEO_EXT.test(url);
}

export function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.replace("/", "") || null;
    }
    if (
      parsed.hostname.includes("youtube.com") ||
      parsed.hostname.includes("youtube-nocookie.com")
    ) {
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] || null;
      }
      return parsed.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

export function vimeoId(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("vimeo.com")) {
      return null;
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    const last = parts.at(-1);
    return last && /^\d+$/.test(last) ? last : null;
  } catch {
    return null;
  }
}

export function embedSrc(url: string) {
  const yt = youtubeId(url);
  if (yt) {
    return `https://www.youtube-nocookie.com/embed/${yt}`;
  }
  const vimeo = vimeoId(url);
  if (vimeo) {
    return `https://player.vimeo.com/video/${vimeo}`;
  }
  return url;
}

export function isEmbeddableVideo(url: string) {
  return Boolean(youtubeId(url) || vimeoId(url));
}

export function videoSrc(urls: string[]) {
  return urls.find((url) => looksLikeVideo(url)) ?? urls[0];
}

export function posterSrc(urls: string[]) {
  return urls.find((url) => looksLikeImage(url));
}

export function inferMediaType(urls: string[]) {
  if (urls.some((url) => isEmbeddableVideo(url))) {
    return "video_embed" as const;
  }
  if (urls.some((url) => looksLikeVideo(url))) {
    return "video" as const;
  }
  if (urls.some((url) => looksLikeAudio(url))) {
    return "audio" as const;
  }
  if (urls.filter((url) => looksLikeImage(url)).length > 1) {
    return "images" as const;
  }
  return "image" as const;
}
