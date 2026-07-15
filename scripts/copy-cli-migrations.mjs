import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "db", "migrations");
const dest = path.join(root, "packages", "cli", "assets", "migrations");

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
}

for (const file of fs.readdirSync(src)) {
  if (file.endsWith(".sql")) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
}

console.log("Copied DB migrations to packages/cli/assets/migrations");
