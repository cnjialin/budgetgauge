import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const now = new Date();
const pad = (value) => String(value).padStart(2, "0");
const buildStamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

const buildGradle = readFileSync(resolve("android", "app", "build.gradle"), "utf8");
const versionNameMatch = buildGradle.match(/versionName\s+"([^"]+)"/);
const appVersion = versionNameMatch?.[1] || "0.0.0";

const buildStampOutput = `export const BUILD_STAMP = "${buildStamp}";\n`;
const appVersionOutput = `export const APP_VERSION = "v${appVersion}";\n`;

writeFileSync(resolve("build-stamp.js"), buildStampOutput, "utf8");
writeFileSync(resolve("app-version.js"), appVersionOutput, "utf8");
