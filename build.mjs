import { build, context } from "esbuild";
import { copyFile, mkdir, rm } from "node:fs/promises";

const watch = process.argv.includes("--watch");

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

const buildOptions = {
  entryPoints: {
    content: "src/content/index.ts",
    background: "src/background/index.ts"
  },
  bundle: true,
  outdir: "dist",
  format: "iife",
  platform: "browser",
  target: ["chrome120"],
  sourcemap: true,
  minify: false
};

async function copyManifest() {
  await copyFile("manifest.json", "dist/manifest.json");
}

if (watch) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  await copyManifest();
  console.log("Watching files...");
} else {
  await build(buildOptions);
  await copyManifest();
  console.log("Build finished.");
}
