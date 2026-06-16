import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateImageFile } from "../../src/app/waste/new/evidence-attachment.ts";

function fakeFile(name, type) {
  return { name, type, size: 1024 } ;
}

describe("evidence-attachment", () => {
  describe("validateImageFile", () => {
    it("return null for image/jpeg", () => {
      assert.equal(validateImageFile(fakeFile("foto.jpg", "image/jpeg")), null);
    });

    it("return null for image/png", () => {
      assert.equal(validateImageFile(fakeFile("foto.png", "image/png")), null);
    });

    it("return null for image/webp", () => {
      assert.equal(validateImageFile(fakeFile("foto.webp", "image/webp")), null);
    });

    it("return null for image/gif", () => {
      assert.equal(validateImageFile(fakeFile("foto.gif", "image/gif")), null);
    });

    it("return null for image/bmp", () => {
      assert.equal(validateImageFile(fakeFile("foto.bmp", "image/bmp")), null);
    });

    it("return null for image/avif", () => {
      assert.equal(validateImageFile(fakeFile("foto.avif", "image/avif")), null);
    });

    it("return error for application/pdf", () => {
      const err = validateImageFile(fakeFile("doc.pdf", "application/pdf"));
      assert.notEqual(err, null);
      assert.ok(err.includes("no es una imagen valida"));
    });

    it("return error for text/plain", () => {
      const err = validateImageFile(fakeFile("nota.txt", "text/plain"));
      assert.notEqual(err, null);
      assert.ok(err.includes("no es una imagen valida"));
    });

    it("return error for application/octet-stream", () => {
      const err = validateImageFile(fakeFile("datos.bin", "application/octet-stream"));
      assert.notEqual(err, null);
      assert.ok(err.includes("no es una imagen valida"));
    });

    it("return error for empty type", () => {
      const err = validateImageFile(fakeFile("sin-extension", ""));
      assert.notEqual(err, null);
      assert.ok(err.includes("no es una imagen valida"));
    });
  });
});
