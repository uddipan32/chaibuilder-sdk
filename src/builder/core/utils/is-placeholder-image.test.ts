import { isPlaceholderImage } from "./is-placeholder-image";

describe("isPlaceholderImage", () => {
  it("should return true for null", () => {
    expect(isPlaceholderImage(null)).toBe(true);
  });

  it("should return true for undefined", () => {
    expect(isPlaceholderImage(undefined)).toBe(true);
  });

  it("should return true for empty string", () => {
    expect(isPlaceholderImage("")).toBe(true);
  });

  it("should return true for base64 SVG placeholder", () => {
    expect(isPlaceholderImage("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAw")).toBe(true);
  });

  it("should return true for placehold.co URLs", () => {
    expect(isPlaceholderImage("https://placehold.co/600x400")).toBe(true);
    expect(isPlaceholderImage("https://placehold.co/300x200/png")).toBe(true);
  });

  it("should return false for URLs that merely contain the word 'placeholder' in the path", () => {
    expect(isPlaceholderImage("https://example.com/placeholder.jpg")).toBe(false);
  });

  it("should return false for normal image URLs", () => {
    expect(isPlaceholderImage("https://example.com/image.jpg")).toBe(false);
    expect(isPlaceholderImage("https://cdn.example.com/assets/photo.png")).toBe(false);
    expect(isPlaceholderImage("https://images.unsplash.com/photo-123")).toBe(false);
  });

  it("should return false for data URIs that are not SVG", () => {
    expect(isPlaceholderImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA")).toBe(false);
  });
});
