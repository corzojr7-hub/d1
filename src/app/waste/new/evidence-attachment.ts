const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/avif"];

export function validateImageFile(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) {
    return "El archivo seleccionado no es una imagen valida. Formatos aceptados: JPEG, PNG, WebP, GIF, BMP, AVIF.";
  }
  return null;
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsDataURL(file);
  });
}
