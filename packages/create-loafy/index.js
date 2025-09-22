#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Get the arguments passed to create-loafy
const args = process.argv.slice(2);

const loafyArgs = ["init", ...args];

// Function to detect which package manager was used to run create-loafy
function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent || "";

  if (userAgent.startsWith("yarn")) {
    return "yarn";
  }

  if (userAgent.startsWith("pnpm")) {
    return "pnpm";
  }

  if (userAgent.startsWith("bun")) {
    return "bun";
  }

  // Default to npm
  return "npm";
}

function getPackageManagerCommand(packageManager) {
  switch (packageManager) {
    case "yarn":
      return { command: "yarn", args: ["dlx"] };
    case "pnpm":
      return { command: "pnpm", args: ["dlx"] };
    case "bun":
      return { command: "bun", args: ["x"] };
    default:
      return { command: "npx", args: [] };
  }
}

let loafyCommand;
let commandArgs;

// First try: look for loafy in the monorepo structure (for development)
const monorepoLoafyPath = path.join(__dirname, "../loafy/dist/index.js");
if (fs.existsSync(monorepoLoafyPath)) {
  loafyCommand = "node";
  commandArgs = [monorepoLoafyPath, ...loafyArgs];
} else {
  try {
    // Second try: use the loafy package directly (if installed locally)
    const loafyPath = require.resolve("loafy/dist/index.js");
    loafyCommand = "node";
    commandArgs = [loafyPath, ...loafyArgs];
  } catch (e) {
    try {
      // Third try: use the detected package manager to run loafy
      const detectedPM = detectPackageManager();
      const pmCommand = getPackageManagerCommand(detectedPM);
      loafyCommand = pmCommand.command;
      commandArgs = [...pmCommand.args, "loafy", ...loafyArgs];
    } catch (e2) {
      // Fourth try: use global loafy command
      loafyCommand = "loafy";
      commandArgs = loafyArgs;
    }
  }
}

const child = spawn(loafyCommand, commandArgs, {
  stdio: "inherit",
  shell: true,
});

child.on("close", (code) => {
  process.exit(code);
});

child.on("error", (err) => {
  console.error("\n❌ Error running loafy:", err.message);
  console.error("Make sure loafy is installed:");
  console.error("  npm install -g loafy");
  console.error("  # or");
  console.error("  yarn global add loafy");
  console.error("  # or");
  console.error("  pnpm add -g loafy");
  console.error("  # or");
  console.error("  bun add -g loafy");
  process.exit(1);
});
