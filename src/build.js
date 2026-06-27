const esbuild = require("esbuild");
const path = require("path");

const configEntry = path.resolve(__dirname, "public/js/main.js");
const barEntry = path.resolve(__dirname, "public/js/bar.js");
const distDir = path.resolve(__dirname, "../dist");

async function buildOne(entry, outfile) {
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    sourcemap: true,
    outfile,
    format: "iife",
    target: "es2015",
    logLevel: "info",
  });
}

async function build() {
  try {
    await Promise.all([
      buildOne(configEntry, path.join(distDir, "bundle.js")),
      buildOne(barEntry, path.join(distDir, "bar.bundle.js")),
    ]);
    console.log("Frontend build successful!");
  } catch (error) {
    console.error("Frontend build failed:", error);
    process.exit(1);
  }
}

async function watch() {
  try {
    const [configCtx, barCtx] = await Promise.all([
      esbuild.context({
        entryPoints: [configEntry],
        bundle: true,
        minify: true,
        sourcemap: true,
        outfile: path.join(distDir, "bundle.js"),
        format: "iife",
        target: "es2015",
        logLevel: "info",
      }),
      esbuild.context({
        entryPoints: [barEntry],
        bundle: true,
        minify: true,
        sourcemap: true,
        outfile: path.join(distDir, "bar.bundle.js"),
        format: "iife",
        target: "es2015",
        logLevel: "info",
      }),
    ]);
    await Promise.all([configCtx.watch(), barCtx.watch()]);
    console.log("Watching for frontend changes...");
  } catch (error) {
    console.error("Frontend watch failed:", error);
    process.exit(1);
  }
}

if (process.argv.includes("--watch")) {
  watch();
} else {
  build();
}
