import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const packagePath = resolve("package.json");
const packageLockPath = resolve("package-lock.json");
const versionJsonPath = resolve("version.json");
const appVersionPath = resolve("app-version.js");
const androidBuildGradlePath = resolve("android", "app", "build.gradle");

const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const appVersion = String(packageJson.version || "").trim();

if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(appVersion)) {
  throw new Error(`package.json version must be a semantic version, got: ${appVersion || "(empty)"}`);
}

writeFileSync(versionJsonPath, `${JSON.stringify({ version: appVersion }, null, "\t")}\n`, "utf8");
writeFileSync(appVersionPath, `export const APP_VERSION = "v${appVersion}";\n`, "utf8");

const packageLock = JSON.parse(readFileSync(packageLockPath, "utf8"));
packageLock.version = appVersion;
if (packageLock.packages?.[""]) {
  packageLock.packages[""].version = appVersion;
}
writeFileSync(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`, "utf8");

const buildGradle = readFileSync(androidBuildGradlePath, "utf8");
const versionCodeMatch = buildGradle.match(/versionCode\s+(\d+)/);

if (!versionCodeMatch) {
  throw new Error("android/app/build.gradle is missing versionCode");
}

const nextVersionCode = Number(versionCodeMatch[1]) + 1;
const nextBuildGradle = buildGradle
  .replace(/versionCode\s+\d+/, `versionCode ${nextVersionCode}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "${appVersion}"`);

if (nextBuildGradle === buildGradle) {
  throw new Error("android/app/build.gradle version fields were not updated");
}

writeFileSync(androidBuildGradlePath, nextBuildGradle, "utf8");

console.log(`Synced app version v${appVersion}; Android versionCode ${nextVersionCode}.`);
