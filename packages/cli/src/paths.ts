import os from "os";
import path from "path";
import fs from "fs";

export function getHolocronDir(): string {
  const dir = path.join(os.homedir(), ".holocron");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getEnvPath(): string {
  return path.join(getHolocronDir(), ".env");
}

export function getComposePath(): string {
  const assetsDir = path.join(__dirname, "..", "assets");
  return path.join(assetsDir, "docker-compose.release.yml");
}

export function getStoragePath(): string {
  const dir = path.join(getHolocronDir(), "data", "storage");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getRepoRoot(): string {
  return path.resolve(__dirname, "..", "..", "..");
}
