import { describe, expect, it } from "vitest";
import { hasImageExtension, isValidHttpUrl } from "./uploader";

describe("isValidHttpUrl", () => {
  it("returns true for valid http URLs", () => {
    expect(isValidHttpUrl("http://example.com/image.png")).toBe(true);
  });

  it("returns true for valid https URLs", () => {
    expect(isValidHttpUrl("https://cdn.example.com/photos/cat.jpg")).toBe(true);
  });

  it("returns false for ftp URLs", () => {
    expect(isValidHttpUrl("ftp://files.example.com/image.png")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidHttpUrl("")).toBe(false);
  });

  it("returns false for random text", () => {
    expect(isValidHttpUrl("not a url at all")).toBe(false);
  });

  it("returns false for relative paths", () => {
    expect(isValidHttpUrl("/images/photo.jpg")).toBe(false);
  });

  it("returns false for data URIs", () => {
    expect(isValidHttpUrl("data:image/png;base64,abc")).toBe(false);
  });

  it("returns false for javascript: protocol", () => {
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("hasImageExtension", () => {
  it("returns true for .jpg URLs", () => {
    expect(hasImageExtension("https://example.com/photo.jpg")).toBe(true);
  });

  it("returns true for .jpeg URLs", () => {
    expect(hasImageExtension("https://example.com/photo.jpeg")).toBe(true);
  });

  it("returns true for .png URLs", () => {
    expect(hasImageExtension("https://example.com/image.png")).toBe(true);
  });

  it("returns true for .gif URLs", () => {
    expect(hasImageExtension("https://example.com/animation.gif")).toBe(true);
  });

  it("returns true for .webp URLs", () => {
    expect(hasImageExtension("https://example.com/photo.webp")).toBe(true);
  });

  it("returns true for .svg URLs", () => {
    expect(hasImageExtension("https://example.com/icon.svg")).toBe(true);
  });

  it("returns true for .avif URLs", () => {
    expect(hasImageExtension("https://example.com/photo.avif")).toBe(true);
  });

  it("returns true for .bmp URLs", () => {
    expect(hasImageExtension("https://example.com/image.bmp")).toBe(true);
  });

  it("returns true for .tiff URLs", () => {
    expect(hasImageExtension("https://example.com/scan.tiff")).toBe(true);
  });

  it("returns true for .tif URLs", () => {
    expect(hasImageExtension("https://example.com/scan.tif")).toBe(true);
  });

  it("returns true for .ico URLs", () => {
    expect(hasImageExtension("https://example.com/favicon.ico")).toBe(true);
  });

  it("returns true for URLs with query parameters after image extension", () => {
    expect(hasImageExtension("https://cdn.example.com/photo.jpg?width=200&quality=80")).toBe(true);
  });

  it("returns true for case-insensitive extensions", () => {
    expect(hasImageExtension("https://example.com/PHOTO.JPG")).toBe(true);
    expect(hasImageExtension("https://example.com/image.PNG")).toBe(true);
  });

  it("returns false for HTML pages", () => {
    expect(hasImageExtension("https://example.com/index.html")).toBe(false);
  });

  it("returns false for URLs with no extension", () => {
    expect(hasImageExtension("https://example.com/some-page")).toBe(false);
  });

  it("returns false for URLs ending in /", () => {
    expect(hasImageExtension("https://example.com/")).toBe(false);
  });

  it("returns false for .pdf URLs", () => {
    expect(hasImageExtension("https://example.com/document.pdf")).toBe(false);
  });

  it("returns false for .js URLs", () => {
    expect(hasImageExtension("https://example.com/script.js")).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(hasImageExtension("not a url")).toBe(false);
  });

  it("returns false for URLs that are clearly web pages", () => {
    expect(hasImageExtension("https://google.com")).toBe(false);
  });
});
