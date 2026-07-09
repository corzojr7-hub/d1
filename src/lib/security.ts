import { z } from "zod";

const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g;
const HTML_TAG_CHARS_RE = /[<>]/g;

export function sanitizeText(value: string) {
  return value.replace(CONTROL_CHARS_RE, "").replace(HTML_TAG_CHARS_RE, "").trim();
}

export function sanitizedTextSchema(min: number, max: number, message: string) {
  return z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().min(min, message).max(max, "Texto demasiado largo."));
}

export const strongPasswordSchema = z
  .string()
  .min(8, "La contrasena debe tener minimo 8 caracteres.")
  .regex(/[A-Z]/, "La contrasena debe incluir al menos una mayuscula.")
  .regex(/[0-9]/, "La contrasena debe incluir al menos un numero.")
  .regex(/[^A-Za-z0-9]/, "La contrasena debe incluir al menos un caracter especial.");
