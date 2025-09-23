import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  renameSync,
} from "fs";
import { join, dirname, basename } from "path";
import { consola } from "consola";
import type {
  BaseTemplate,
  PackageAddon,
  ProjectConfig,
  Language,
} from "../types/template.js";
import type { PackageManager } from "../helpers/get-pkg-manager.js";
import { replaceFile } from "./replace-files.js";

interface CreateProjectOptions {
  baseTemplate: BaseTemplate;
  packageAddons: PackageAddon[];
  skipInstall: boolean;
}

export async function createProject(
  appPath: string,
  config: ProjectConfig,
  options: CreateProjectOptions
): Promise<void> {
  const { baseTemplate, packageAddons, skipInstall } = options;

  consola.start("Creating project...");

  // Create project directory
  mkdirSync(appPath, { recursive: true });

  // Copy base template
  await copyTemplate(baseTemplate, config.language, appPath);

  // Copy selected packages
  for (const addon of packageAddons) {
    await copyPackage(addon, config.language, appPath);
  }

  // Create package.json or update existing one
  await setupPackageJson(appPath, config);

  // Install dependencies if not skipped
  if (!skipInstall) {
    await installDependencies(appPath, config.packageManager as PackageManager);
  }

  consola.success("Project created successfully!");
}

/**
 * Recursively apply file replacements in a directory
 * @param dirPath - Directory path to scan for files to rename
 */
function applyFileReplacements(dirPath: string): void {
  if (!existsSync(dirPath)) return;

  const items = readdirSync(dirPath);

  for (const item of items) {
    const itemPath = join(dirPath, item);
    const itemStat = statSync(itemPath);

    if (itemStat.isDirectory()) {
      // Recursively process subdirectories
      applyFileReplacements(itemPath);
    } else if (itemStat.isFile()) {
      // Check if this file needs to be renamed
      const filename = basename(itemPath);

      for (const [sourceFilename, targetFilename] of replaceFile) {
        if (filename === sourceFilename) {
          const newPath = join(dirname(itemPath), targetFilename);
          try {
            renameSync(itemPath, newPath);
            consola.debug(`Renamed ${sourceFilename} to ${targetFilename}`);
          } catch (error) {
            consola.warn(
              `Failed to rename ${sourceFilename} to ${targetFilename}: ${error}`
            );
          }
          break; // Only apply the first matching replacement
        }
      }
    }
  }
}

async function copyTemplate(
  template: BaseTemplate,
  language: Language,
  destinationPath: string
): Promise<void> {
  const sourcePath = join(template.path, language);

  if (!existsSync(sourcePath)) {
    throw new Error(`Template source not found: ${sourcePath}`);
  }

  consola.info(`Copying ${template.title} template...`);

  try {
    cpSync(sourcePath, destinationPath, {
      recursive: true,
      filter: (src: string) => {
        // Skip config.json files
        return !src.endsWith("config.json");
      },
    });

    // Apply file replacements after copying
    applyFileReplacements(destinationPath);
  } catch (error) {
    throw new Error(`Failed to copy template: ${error}`);
  }
}

async function copyPackage(
  addon: PackageAddon,
  language: Language,
  destinationPath: string
): Promise<void> {
  const sourcePath = join(addon.path, language);

  if (!existsSync(sourcePath)) {
    consola.warn(`Package source not found for ${addon.title}: ${sourcePath}`);
    return;
  }

  consola.info(`Adding ${addon.title}...`);

  try {
    cpSync(sourcePath, destinationPath, {
      recursive: true,
      filter: (src: string) => {
        // Skip config.json files
        return !src.endsWith("config.json");
      },
    });

    // Apply file replacements after copying
    applyFileReplacements(destinationPath);
  } catch (error) {
    consola.warn(`Failed to copy package ${addon.title}: ${error}`);
  }
}

async function setupPackageJson(
  appPath: string,
  config: ProjectConfig
): Promise<void> {
  const packageJsonPath = join(appPath, "package.json");

  let packageJson: any = {};

  // Read existing package.json if it exists
  if (existsSync(packageJsonPath)) {
    try {
      const content = readFileSync(packageJsonPath, "utf-8");
      packageJson = JSON.parse(content);
    } catch (error) {
      consola.warn("Could not parse existing package.json, creating new one");
    }
  }

  // Update package.json with project name
  packageJson.name = config.name;

  if (!packageJson.version) {
    packageJson.version = "0.1.0";
  }

  if (!packageJson.private) {
    packageJson.private = true;
  }

  // Write updated package.json
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

async function installDependencies(
  appPath: string,
  packageManager: PackageManager
): Promise<void> {
  consola.start("Installing dependencies...");

  const commands = {
    npm: "npm install",
    yarn: "yarn install",
    pnpm: "pnpm install",
    bun: "bun install",
  };

  const command = commands[packageManager];

  try {
    const { spawn } = await import("child_process");

    await new Promise<void>((resolve, reject) => {
      const process = spawn(
        command.split(" ")[0],
        command.split(" ").slice(1),
        {
          cwd: appPath,
          stdio: "inherit",
          shell: true,
        }
      );

      process.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Install process exited with code ${code}`));
        }
      });

      process.on("error", reject);
    });

    consola.success("Dependencies installed successfully!");
  } catch (error) {
    consola.error("Failed to install dependencies:", error);
    consola.info(`You can manually install dependencies by running:`);
    consola.info(`  cd ${appPath}`);
    consola.info(`  ${command}`);
  }
}
