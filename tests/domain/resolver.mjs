import { extname } from "node:path";

const knownExtensions = [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts", ".json", ".node"];

export function resolve(specifier, context, nextResolve) {
  const parentURL = context.parentURL;
  const parentIsTS = parentURL && /\.(ts|mts|cts)$/.test(parentURL);
  if (parentIsTS && specifier.startsWith(".") && !knownExtensions.includes(extname(specifier))) {
    try {
      return nextResolve(specifier + ".ts", context);
    } catch {
      // fall through to default resolver
    }
  }
  return nextResolve(specifier, context);
}
