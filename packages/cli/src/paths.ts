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

export function getDataDir(): string {
  const dir = path.join(getHolocronDir(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getComposePath(): string {
  const assetsDir = path.join(__dirname, "..", "assets");
  return path.join(assetsDir, "docker-compose.release.yml");
}

export function getMigrationsDir(): string {
  return path.join(__dirname, "..", "assets", "migrations");
}

export function getStoragePath(): string {
  const dir = path.join(getDataDir(), "storage");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getRepoRoot(): string {
  return path.resolve(__dirname, "..", "..", "..");
}

export function getPackageVersion(): string {
  try {
    const pkgPath = path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}
