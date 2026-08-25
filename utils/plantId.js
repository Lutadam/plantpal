import { File, UploadType } from "expo-file-system";
import { PLANTNET_API_KEY } from "../plantnet/config";

const IDENTIFY_URL = "https://my-api.plantnet.org/v2/identify/all";
const MIN_CONFIDENCE = 0.2;

// status: "unavailable" (no key / network / server error — stay silent, feature just
// isn't usable right now) | "no-match" (PlantNet responded but wasn't confident enough
// — safe to tell the user this doesn't look like a recognizable plant) | "matched"
export async function identifySpecies(localUri) {
  if (!PLANTNET_API_KEY || PLANTNET_API_KEY === "YOUR_PLANTNET_API_KEY") {
    return { status: "unavailable" };
  }

  try {
    const file = new File(localUri);

    const uploadResult = await file.upload(
      `${IDENTIFY_URL}?api-key=${PLANTNET_API_KEY}`,
      {
        uploadType: UploadType.MULTIPART,
        fieldName: "images",
        mimeType: "image/jpeg",
        parameters: { organs: "auto" },
      },
    );
    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      return { status: "unavailable" };
    }

    const data = JSON.parse(uploadResult.body);
    const top = data.results?.[0];
    if (!top || top.score < MIN_CONFIDENCE) {
      return { status: "no-match" };
    }

    return {
      status: "matched",
      commonName: top.species.commonNames?.[0] ?? null,
      scientificName: top.species.scientificNameWithoutAuthor,
      score: top.score,
    };
  } catch {
    return { status: "unavailable" };
  }
}
