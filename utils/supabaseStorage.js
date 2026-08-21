import { useEffect, useState } from "react";
import { File } from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { supabase } from "../supabase/config";

const BUCKET = "plant-photos";
const SIGNED_URL_TTL_SECONDS = 3600;
const SIGNED_URL_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const signedUrlCache = new Map();

function extensionOf(uri) {
  return uri.split(".").pop().split("?")[0] || "jpg";
}

export async function uploadPlantPhoto(userId, localUri) {
  const extension = extensionOf(localUri);
  const file = new File(localUri);
  const base64 = await file.base64();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType: `image/${extension}` });
  if (error) throw error;

  return path;
}

export async function getSignedPhotoUrls(paths) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  const now = Date.now();
  const missing = uniquePaths.filter((path) => {
    const cached = signedUrlCache.get(path);
    return !cached || cached.expiresAt <= now;
  });

  if (missing.length > 0) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(missing, SIGNED_URL_TTL_SECONDS);
    if (!error && data) {
      data.forEach((entry) => {
        if (entry.signedUrl) {
          signedUrlCache.set(entry.path, {
            url: entry.signedUrl,
            expiresAt: now + (SIGNED_URL_TTL_SECONDS - 60) * 1000,
          });
        }
      });
    }
  }

  const result = {};
  uniquePaths.forEach((path) => {
    const cached = signedUrlCache.get(path);
    if (cached) result[path] = cached.url;
  });
  return result;
}

export function useSignedPhotoUrls(paths) {
  const [urlMap, setUrlMap] = useState({});
  const key = paths.filter(Boolean).join("|");

  useEffect(() => {
    let cancelled = false;
    if (!key) {
      setUrlMap({});
      return;
    }
    const refresh = () => {
      getSignedPhotoUrls(key.split("|")).then((map) => {
        if (!cancelled) setUrlMap(map);
      });
    };
    refresh();
    const interval = setInterval(refresh, SIGNED_URL_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [key]);

  return urlMap;
}

export async function deletePlantPhotoFiles(paths) {
  const uniquePaths = [...new Set((paths || []).filter(Boolean))];
  if (uniquePaths.length === 0) return;
  uniquePaths.forEach((path) => signedUrlCache.delete(path));
  await supabase.storage.from(BUCKET).remove(uniquePaths);
}
