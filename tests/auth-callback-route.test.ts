import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "@/app/auth/callback/sanitize-next-path";

describe("sanitizeNextPath", () => {
  it("preserves safe in-app paths", () => {
    expect(sanitizeNextPath("/children/123")).toBe("/children/123");
    expect(sanitizeNextPath("/perfil?tab=dados")).toBe("/perfil?tab=dados");
  });

  it("falls back to root for empty or missing values", () => {
    expect(sanitizeNextPath(null)).toBe("/");
    expect(sanitizeNextPath("")).toBe("/");
  });

  it("rejects protocol-relative and absolute external targets", () => {
    expect(sanitizeNextPath("//evil.example/path")).toBe("/");
    expect(sanitizeNextPath("https://evil.example/path")).toBe("/");
    expect(sanitizeNextPath("javascript:alert(1)")).toBe("/");
  });
});