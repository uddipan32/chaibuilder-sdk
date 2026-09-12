import Compressor from "compressorjs";
import { toast } from "sonner";

// Maximum size before compression (3MB)
const MAX_COMPRESS_SIZE = 0.5 * 1024 * 1024;
const MAX_AFTER_COMPRESS_SIZE = 10 * 1024 * 1024;

export function formatFileSize(_bytes: number): string {
  const bytes = isNaN(_bytes) ? 0 : typeof _bytes === "number" ? _bytes : parseInt(_bytes);
  if (!bytes || bytes < 0) return "0 B";
  if (bytes < 1024) {
    return `${bytes.toFixed(2)} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

/**
 * Compress an image file if it's larger than 3MB
 * @param file - The image file to compress
 * @returns Promise that resolves to the compressed file or original file if under 3MB
 */
export function compressImageIfNeeded(file: File): Promise<File | Blob> {
  return new Promise((resolve, reject) => {
    // Check if file is larger than 3MB
    if (file.size <= MAX_COMPRESS_SIZE) {
      // File is already under 3MB, no need to compress
      resolve(file);
      return;
    }

    new Compressor(file, {
      quality: 0.9, // 80% quality
      maxWidth: 2048, // Limit max width
      maxHeight: 2048, // Limit max height
      convertSize: MAX_COMPRESS_SIZE, // Try to keep under 3MB
      success(result) {
        resolve(result);
      },
      error(err) {
        toast.error(
          `Failed to compress image. Image size is ${formatFileSize(file.size)}, which exceeds the maximum allowed size of ${formatFileSize(MAX_AFTER_COMPRESS_SIZE)}.`,
        );
        reject(err);
      },
    });
  });
}

if (import.meta.vitest) {
  const { describe, it, expect, vi } = import.meta.vitest;

  // Mock compressorjs module
  vi.mock("compressorjs", () => {
    return {
      default: vi.fn(),
    };
  });

  describe("formatFileSize", () => {
    it("should format 0 bytes", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("should format bytes less than 1KB", () => {
      expect(formatFileSize(100)).toBe("100.00 B");
      expect(formatFileSize(512)).toBe("512.00 B");
      expect(formatFileSize(1023)).toBe("1023.00 B");
    });

    it("should format kilobytes", () => {
      expect(formatFileSize(1024)).toBe("1.00 KB");
      expect(formatFileSize(2048)).toBe("2.00 KB");
      expect(formatFileSize(512 * 1024)).toBe("512.00 KB");
    });

    it("should format megabytes", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
      expect(formatFileSize(5 * 1024 * 1024)).toBe("5.00 MB");
      expect(formatFileSize(10.5 * 1024 * 1024)).toBe("10.50 MB");
    });

    it("should handle NaN values", () => {
      expect(formatFileSize(NaN)).toBe("0 B");
    });

    it("should handle string numbers", () => {
      expect(formatFileSize("1024" as any)).toBe("1.00 KB");
      expect(formatFileSize("2097152" as any)).toBe("2.00 MB");
    });

    it("should handle invalid string values", () => {
      expect(formatFileSize("invalid" as any)).toBe("0 B");
    });

    it("should handle negative values", () => {
      expect(formatFileSize(-100)).toBe("0 B");
    });

    it("should format decimal values correctly", () => {
      expect(formatFileSize(1536)).toBe("1.50 KB");
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.50 MB");
    });

    it("should handle edge case at KB boundary", () => {
      expect(formatFileSize(1023.99)).toBe("1023.99 B");
      expect(formatFileSize(1024.01)).toBe("1.00 KB");
    });

    it("should handle edge case at MB boundary", () => {
      expect(formatFileSize(1024 * 1024 - 1)).toBe("1024.00 KB");
      expect(formatFileSize(1024 * 1024 + 1)).toBe("1.00 MB");
    });
  });

  describe("compressImageIfNeeded", () => {
    it("should return original file if size is under MAX_COMPRESS_SIZE (0.5MB)", async () => {
      const smallFile = new File(["x".repeat(100000)], "small.jpg", { type: "image/jpeg" });
      const result = await compressImageIfNeeded(smallFile);
      expect(result).toBe(smallFile);
    });

    it("should return original file if size equals MAX_COMPRESS_SIZE", async () => {
      const exactFile = new File(["x".repeat(0.5 * 1024 * 1024)], "exact.jpg", { type: "image/jpeg" });
      const result = await compressImageIfNeeded(exactFile);
      expect(result).toBe(exactFile);
    });

    it("should attempt compression for files larger than MAX_COMPRESS_SIZE", async () => {
      const largeFile = new File(["x".repeat(1 * 1024 * 1024)], "large.jpg", { type: "image/jpeg" });

      // Mock Compressor implementation
      vi.mocked(Compressor).mockImplementationOnce(function (this: any, file: File | Blob, options?: any) {
        const compressedBlob = new Blob(["compressed"], { type: "image/jpeg" });
        Promise.resolve().then(() => options.success(compressedBlob));
      } as any);

      const result = await compressImageIfNeeded(largeFile);
      expect(result).toBeInstanceOf(Blob);
    });

    it("should handle compression errors", async () => {
      const largeFile = new File(["x".repeat(1 * 1024 * 1024)], "large.jpg", { type: "image/jpeg" });

      vi.mocked(Compressor).mockImplementationOnce(function (this: any, file: File | Blob, options?: any) {
        Promise.resolve().then(() => options.error(new Error("Compression failed")));
      } as any);

      await expect(compressImageIfNeeded(largeFile)).rejects.toThrow("Compression failed");
    });

    it("should handle very small files (< 1KB)", async () => {
      const tinyFile = new File(["tiny"], "tiny.jpg", { type: "image/jpeg" });
      const result = await compressImageIfNeeded(tinyFile);
      expect(result).toBe(tinyFile);
    });

    it("should handle empty files", async () => {
      const emptyFile = new File([], "empty.jpg", { type: "image/jpeg" });
      const result = await compressImageIfNeeded(emptyFile);
      expect(result).toBe(emptyFile);
    });

    it("should handle files at exactly 0.5MB boundary", async () => {
      const boundaryFile = new File(["x".repeat(0.5 * 1024 * 1024)], "boundary.jpg", {
        type: "image/jpeg",
      });
      const result = await compressImageIfNeeded(boundaryFile);
      expect(result).toBe(boundaryFile);
    });

    it("should handle files just over 0.5MB boundary", async () => {
      const overBoundaryFile = new File(["x".repeat(0.5 * 1024 * 1024 + 1)], "over.jpg", {
        type: "image/jpeg",
      });

      vi.mocked(Compressor).mockImplementationOnce(function (this: any, file: File | Blob, options?: any) {
        const compressedBlob = new Blob(["compressed"], { type: "image/jpeg" });
        Promise.resolve().then(() => options.success(compressedBlob));
      } as any);

      const result = await compressImageIfNeeded(overBoundaryFile);
      expect(result).toBeInstanceOf(Blob);
    });

    it("should handle different image types", async () => {
      const pngFile = new File(["x".repeat(100)], "image.png", { type: "image/png" });
      const result = await compressImageIfNeeded(pngFile);
      expect(result).toBe(pngFile);
    });

    it("should preserve file metadata for small files", async () => {
      const file = new File(["content"], "test.jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      const result = await compressImageIfNeeded(file);
      expect(result).toBe(file);
      expect((result as File).name).toBe("test.jpg");
    });
  });
}
