const esbuild = require("esbuild");
const path = require("path");

const buildOptions = {
  entryPoints: [path.resolve(__dirname, "public/js/main.js")],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: path.resolve(__dirname, "../dist/bundle.js"),
  format: "iife", // Immediately Invoked Function Expression for broad browser compatibility
  target: "es2015", // Target ES2015 for broad older browser support
  logLevel: "info",
};

async function build() {
  try {
    await esbuild.build(buildOptions);
    console.log("Frontend build successful!");
  } catch (error) {
    console.error("Frontend build failed:", error);
    process.exit(1);
  }
}

async function watch() {
  try {
    const context = await esbuild.context(buildOptions);
    await context.watch();
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
