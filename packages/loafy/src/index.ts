#!/usr/bin/env node

import { Command } from "commander";
import { consola } from "consola";
import {
  getPkgManager,
  type PackageManager,
} from "./helpers/get-pkg-manager.js";
import { initProject, addCommonOptions } from "./commands/init.js";
import updateCheck from "update-check";
import packageJson from "../package.json" with { type: "json" };

// Configure consola to remove timestamps and extra formatting
consola.options.formatOptions.date = false;

const handleSigTerm = () => process.exit(0);

process.on("SIGINT", handleSigTerm);
process.on("SIGTERM", handleSigTerm);

const program = new Command();
program
  .name("loafy")
  .description("A modern full-stack project scaffolding CLI")
  .version(packageJson.version);

// Add init command
addCommonOptions(program.command("init"))
  .argument("[project-name]", "Name of the project to create")
  .description("Initialize a new Loafy project")
  .action(async (projectName, options) => {
    // Only use explicitly provided package manager, otherwise let the init command handle it
    let packageManager: PackageManager | undefined;

    if (options.useNpm) {
      packageManager = "npm";
    } else if (options.usePnpm) {
      packageManager = "pnpm";
    } else if (options.useYarn) {
      packageManager = "yarn";
    } else if (options.useBun) {
      packageManager = "bun";
    } else if (options.packageManager) {
      packageManager = options.packageManager as PackageManager;
    }
    // If none explicitly provided, let selectPackageManager handle it

    await initProject({
      projectName,
      packageManager,
      headless: options.headless,
      skipInstall: options.skipInstall,
      builders: options.builders,
      verbose: options.verbose,
    });
  });

program
  .option(
    "--use-npm",
    "Explicitly tell the CLI to bootstrap the application using npm."
  )
  .option(
    "--use-pnpm",
    "Explicitly tell the CLI to bootstrap the application using pnpm."
  )
  .option(
    "--use-yarn",
    "Explicitly tell the CLI to bootstrap the application using Yarn."
  )
  .option(
    "--use-bun",
    "Explicitly tell the CLI to bootstrap the application using Bun."
  );

program.parse(process.argv);

const opts = program.opts();

const packageManager: PackageManager = !!opts.useNpm
  ? "npm"
  : !!opts.usePnpm
    ? "pnpm"
    : !!opts.useYarn
      ? "yarn"
      : !!opts.useBun
        ? "bun"
        : getPkgManager();

const update = updateCheck(packageJson).catch(() => null);

async function notifyUpdate(): Promise<void> {
  try {
    if ((await update)?.latest) {
      const global = {
        npm: "npm i -g",
        yarn: "yarn global add",
        pnpm: "pnpm add -g",
        bun: "bun add -g",
      };
      const updateMessage = `${global[packageManager]} loafy`;
      consola.success(
        `A new version of Loafy is available! Run ${updateMessage} to update.`
      );
    }
  } catch {
    // ignore error
  }
}

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

// Handle update notifications
if (process.argv.includes("init")) {
  process.on("exit", (code) => {
    if (code === 0) {
      notifyUpdate();
    }
  });
}
