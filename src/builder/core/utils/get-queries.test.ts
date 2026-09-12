import { describe, expect, it } from "vitest";
import { getQueries } from "./get-queries";

describe("getQueries", () => {
  it("should return correct queries for xs", () => {
    expect(getQueries("xs")).toEqual(["xs"]);
  });

  it("should return correct queries for sm", () => {
    expect(getQueries("sm")).toEqual(["xs", "sm"]);
  });

  it("should return correct queries for md", () => {
    expect(getQueries("md")).toEqual(["xs", "sm", "md"]);
  });

  it("should return correct queries for lg", () => {
    expect(getQueries("lg")).toEqual(["xs", "sm", "md", "lg"]);
  });

  it("should return correct queries for xl", () => {
    expect(getQueries("xl")).toEqual(["xs", "sm", "md", "lg", "xl"]);
  });

  it("should return correct queries for 2xl", () => {
    expect(getQueries("2xl")).toEqual(["xs", "sm", "md", "lg", "xl", "2xl"]);
  });

  it("should return default queries for unknown input", () => {
    expect(getQueries("unknown")).toEqual(["xs"]);
  });
});
