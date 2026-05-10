import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const now = new Date();
const pad = (value) => String(value).padStart(2, "0");
const buildStamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

const buildStampOutput = `export const BUILD_STAMP = "${buildStamp}";\n`;

writeFileSync(resolve("build-stamp.js"), buildStampOutput, "utf8");
