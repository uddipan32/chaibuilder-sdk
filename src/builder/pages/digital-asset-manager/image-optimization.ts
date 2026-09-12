import Compressor from "compressorjs";

/**
 * Sanitizes a filename:
 * - Removes non-alphanumeric characters (except dashes and underscores)
 * - Limits length to 50 characters
 * - Keeps extension
 */
export function sanitizeFileName(name: string): string {
  const extensionIndex = name.lastIndexOf(".");
  const extension = extensionIndex !== -1 ? name.substring(extensionIndex) : "";
  const baseName = extensionIndex !== -1 ? name.substring(0, extensionIndex) : name;

  const sanitizedBase = baseName
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .substring(0, 50 - extension.length);

  return `${sanitizedBase}${extension}`;
}

/**
 * Optimizes an image:
 * - Converts to WebP
 * - Aims for < 250KB
 * - Returns a new File object with sanitized name
 */
export async function optimizeImage(file: File | Blob, originalName: string): Promise<File> {
  let sanitizedName = sanitizeFileName(originalName);
  if (sanitizedName.includes(".")) {
    sanitizedName = sanitizedName.replace(/\.[^.]+$/, ".webp");
  } else {
    sanitizedName = sanitizedName + ".webp";
  }

  // Ensure name is not empty before .webp
  if (sanitizedName === ".webp") {
    sanitizedName = "image.webp";
  }

  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.8,
      mimeType: "image/webp",
      convertSize: 250 * 1024, // Try to keep under 250KB
      success(result) {
        // Result is a Blob, convert to File
        const optimizedFile = new File([result], sanitizedName, {
          type: "image/webp",
          lastModified: Date.now(),
        });
        resolve(optimizedFile);
      },
      error(err) {
        reject(err);
      },
    });
  });
}

/**
 * Fetches an image from a URL and returns a File object
 */
export async function fileFromUrl(url: string, fileName: string): Promise<File> {
  const response = await fetch(url);
  const data = await response.blob();
  const metadata = { type: data.type };
  return new File([data], fileName, metadata);
}
