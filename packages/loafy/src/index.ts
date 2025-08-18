#!/usr/bin/env node

import { Command } from "commander";
import { consola, createConsola } from "consola";
import {
  getPkgManager,
  type PackageManager,
} from "./helpers/get-pkg-manager.js";
import updateCheck from "update-check";
import packageJson from "../package.json" with { type: "json" };

const handleSigTerm = () => process.exit(0);

process.on("SIGINT", handleSigTerm);
process.on("SIGTERM", handleSigTerm);

const program = new Command();
program
  .name("Loafy")
  .description("Loafy CLI")
  .version(packageJson.version)
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
  )
  .parse(process.argv);

const opts = program.opts();
const { args } = program;

const packageManager: PackageManager = !!opts.useNpm
  ? "npm"
  : !!opts.usePnpm
    ? "pnpm"
    : !!opts.useYarn
      ? "yarn"
      : !!opts.useBun
        ? "bun"
        : getPkgManager();

async function run() {}

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
      const updateMessage = `${global[packageManager]} create-next-app`;
      consola.success(
        `A new version of Loafy is available! Run ${updateMessage} to update.`
      );
    }
    process.exit(0);
  } catch {
    // ignore error
  }
}

async function exit(reason: { command?: string }) {
  console.log();
  console.log("Aborting installation.");
  if (reason.command) {
    consola.error(`  ${reason.command} has failed.`);
  } else {
    consola.error("  An unexpected error occurred.");
  }
  console.log();
  await notifyUpdate();
  process.exit(1);
}

run().then(notifyUpdate).catch(exit);
