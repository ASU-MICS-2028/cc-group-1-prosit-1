import { db } from "@/db/local"

export interface Fix {
  latitude: number
  longitude: number
  accuracyMetres: number
}

/** Why the farm could not be located: the person said no, or the phone could not get a fix. */
export type LocationProblem = "denied" | "failed"

/**
 * The phone's GPS position. Works offline (GPS needs no network). Rejects with a
 * LocationProblem; the form carries on without a location rather than blocking the farmer.
 */
export function findLocation(): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject("failed" satisfies LocationProblem)
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
          accuracyMetres: Math.round(coords.accuracy),
        }),
      (error) =>
        reject(
          (error.code === error.PERMISSION_DENIED
            ? "denied"
            : "failed") satisfies LocationProblem
        ),
      { enableHighAccuracy: true, timeout: 30_000, maximumAge: 60_000 }
    )
  })
}

/** Phone cameras take 3 to 5 MB pictures; this keeps one under ~150 KB for 2G upload. */
const MAX_PHOTO_MB = 0.15

/**
 * Shrinks the photo and keeps it on the phone until sync. The compression library is only
 * downloaded the first time someone takes a photo. Replaces (and deletes) `previousId`.
 */
export async function keepPhoto(
  file: File,
  previousId: string | null
): Promise<{ id: string; sizeBytes: number }> {
  const { default: compress } = await import("browser-image-compression")
  const blob = await compress(file, {
    maxSizeMB: MAX_PHOTO_MB,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/jpeg",
  })
  const id = crypto.randomUUID()
  await db.transaction("rw", db.photos, async () => {
    if (previousId) await db.photos.delete(previousId)
    await db.photos.add({
      id,
      farmerId: null,
      blob,
      contentType: blob.type || "image/jpeg",
      sizeBytes: blob.size,
      createdAt: new Date().toISOString(),
    })
  })
  return { id, sizeBytes: blob.size }
}
