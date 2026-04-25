import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, "../../data/state.json");
const dst = resolve(__dirname, "../public/state.json");

if (!existsSync(src)) {
  console.warn(
    `[copy-state] ${src} does not exist yet. Run the backend exporter first:\n` +
      `  cd backend && python -m axis export --scenario eastern_europe --out ../data/state.json`,
  );
  process.exit(0);
}

mkdirSync(dirname(dst), { recursive: true });
copyFileSync(src, dst);
console.log(`[copy-state] ${src} -> ${dst}`);
