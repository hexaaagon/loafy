#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Get the arguments passed to create-loafy
const args = process.argv.slice(2);

const loafyArgs = ["init", ...args];

let loafyCommand;
let commandArgs;

// First try: look for loafy in the monorepo structure (for development)
const monorepoLoafyPath = path.join(__dirname, "../loafy/dist/index.js");
if (fs.existsSync(monorepoLoafyPath)) {
  loafyCommand = "node";
  commandArgs = [monorepoLoafyPath, ...loafyArgs];
} else {
  // Second try: use the loafy package dependency (installed with create-loafy)
  try {
    const loafyPath = require.resolve("loafy/dist/index.js");
    loafyCommand = "node";
    commandArgs = [loafyPath, ...loafyArgs];
  } catch (e) {
    console.error("\n❌ Error: loafy package not found");
    console.error("This should not happen. Please report this issue.");
    console.error("GitHub: https://github.com/hexaaagon/loafy/issues");
    process.exit(1);
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
  console.error("Please report this issue:");
  console.error("GitHub: https://github.com/hexaaagon/loafy/issues");
  process.exit(1);
});
