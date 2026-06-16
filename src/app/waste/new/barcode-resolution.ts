import { findProductByBarcode } from "@/app/waste/actions";

export async function resolveProductIdFromBarcode(
  barcode: string,
  product_not_found: boolean,
): Promise<string> {
  if (product_not_found) return "";
  if (!barcode) return "";
  const match = await findProductByBarcode(barcode);
  return match ? match.id : "";
}
