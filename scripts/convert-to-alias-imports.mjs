/**
 * Заменяет parent-relative импорты (../…) на @/ и @/shared/.
 * Запуск: node scripts/convert-to-alias-imports.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");
const sharedRoot = path.join(root, "shared");

const IMPORT_RE =
  /(?<=(?:\bfrom|\bimport)\s+['"])(\.\.[^'"]+)(?=['"])/g;

function splitImportPath(spec) {
  const q = spec.indexOf("?");
  if (q === -1) return { base: spec, suffix: "" };
  return { base: spec.slice(0, q), suffix: spec.slice(q) };
}

function toAlias(filePath, spec) {
  if (!spec.startsWith(".")) return spec;

  const { base, suffix } = splitImportPath(spec);
  const resolved = path.normalize(path.join(path.dirname(filePath), base));

  if (resolved.startsWith(srcRoot + path.sep) || resolved === srcRoot) {
    const rel = path.relative(srcRoot, resolved).replace(/\\/g, "/");
    return `@/${rel}${suffix}`;
  }

  if (resolved.startsWith(sharedRoot + path.sep) || resolved === sharedRoot) {
    const rel = path.relative(sharedRoot, resolved).replace(/\\/g, "/");
    return `@/shared/${rel}${suffix}`;
  }

  return spec;
}

function convertFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const next = original.replace(IMPORT_RE, (match) => toAlias(filePath, match));
  if (next !== original) {
    fs.writeFileSync(filePath, next, "utf8");
    return true;
  }
  return false;
}

function walk(dir) {
  let changed = 0;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      changed += walk(full);
    } else if (/\.(ts|tsx)$/.test(name.name)) {
      if (convertFile(full)) changed += 1;
    }
  }
  return changed;
}

const targets = [srcRoot, path.join(root, "server", "src")];
let total = 0;
for (const dir of targets) {
  if (fs.existsSync(dir)) total += walk(dir);
}
console.log(`Updated ${total} files`);
