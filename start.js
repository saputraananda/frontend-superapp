/* eslint-env node */
import { execSync } from "child_process";

try {
  execSync("npm run build", { stdio: "inherit" });
} catch (err) {
  console.error("Build failed:", err?.message || err);
  process.exit(1);
}

import("./server.js");