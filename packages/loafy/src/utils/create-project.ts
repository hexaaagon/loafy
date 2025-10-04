import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  renameSync,
} from "node:fs";
import { join, dirname, basename } from "node:path";
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

/**
 * Read version from builder's package.json
 * @param builderPath - Path to the builder directory
 * @returns Version string or "1.0.0" as fallback
 */
function getBuilderVersion(builderPath: string): string {
  try {
    const packageJsonPath = join(builderPath, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      return packageJson.version || "1.0.0";
    }
  } catch (error) {
    consola.debug(`Failed to read builder version: ${error}`);
  }
  return "1.0.0";
}

/**
 * Replace template placeholders in file content
 * @param content - File content with placeholders
 * @param config - Project configuration
 * @returns Content with placeholders replaced
 */
function replaceTemplatePlaceholders(
  content: string,
  config: ProjectConfig
): string {
  return content
    .replace(/\{\{config\.projectName\}\}/g, config.name)
    .replace(/\{\{config\.name\}\}/g, config.name)
    .replace(/\{\{config\.version\}\}/g, config.version || "1.0.0")
    .replace(/\{\{config\.owner\}\}/g, config.owner || "username");
}

/**
 * Process template files recursively and replace placeholders
 * @param dirPath - Directory path to scan for template files
 * @param config - Project configuration
 */
function processTemplateFiles(dirPath: string, config: ProjectConfig): void {
  if (!existsSync(dirPath)) return;

  const items = readdirSync(dirPath);

  for (const item of items) {
    const itemPath = join(dirPath, item);
    const itemStat = statSync(itemPath);

    if (itemStat.isDirectory()) {
      // Recursively process subdirectories
      processTemplateFiles(itemPath, config);
    } else if (itemStat.isFile()) {
      // Process files that might contain templates
      const filename = basename(itemPath);

      // Only process text files that might contain templates
      if (
        filename.endsWith(".json") ||
        filename.endsWith(".md") ||
        filename.endsWith(".txt") ||
        filename.endsWith(".yml") ||
        filename.endsWith(".yaml") ||
        filename.endsWith(".toml") ||
        filename.endsWith(".ts") ||
        filename.endsWith(".tsx") ||
        filename.endsWith(".js") ||
        filename.endsWith(".jsx")
      ) {
        try {
          const content = readFileSync(itemPath, "utf-8");

          // Check if file contains template placeholders
          if (content.includes("{{config.")) {
            const updatedContent = replaceTemplatePlaceholders(content, config);
            writeFileSync(itemPath, updatedContent, "utf-8");
            consola.debug(`Processed template placeholders in: ${filename}`);
          }
        } catch (error) {
          consola.warn(`Failed to process template file ${filename}: ${error}`);
        }
      }
    }
  }
}

export async function createProject(
  appPath: string,
  config: ProjectConfig,
  options: CreateProjectOptions
): Promise<void> {
  const { baseTemplate, packageAddons, skipInstall } = options;

  consola.start("Creating project...");

  // Read version from builder's package.json
  if (!config.version) {
    config.version = getBuilderVersion(baseTemplate.path);
  }

  // Create project directory
  mkdirSync(appPath, { recursive: true });

  // Copy base template
  await copyTemplate(baseTemplate, config.language, appPath);

  // Copy selected packages
  for (const addon of packageAddons) {
    await copyPackage(addon, config.language, appPath);
  }

  // Process template placeholders in all copied files
  processTemplateFiles(appPath, config);

  // Create package.json or update existing one
  await setupPackageJson(appPath, config, baseTemplate, packageAddons);

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
        const fileName = basename(src);
        // Skip config.json and _package.json files
        return fileName !== "config.json" && fileName !== "_package.json";
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
        const fileName = basename(src);
        // Skip config.json and _package.json files
        return fileName !== "config.json" && fileName !== "_package.json";
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
  config: ProjectConfig,
  baseTemplate: BaseTemplate,
  packageAddons: PackageAddon[]
): Promise<void> {
  const packageJsonPath = join(appPath, "package.json");

  let packageJson: any = {};

  // Read existing package.json if it exists
  if (existsSync(packageJsonPath)) {
    try {
      let content = readFileSync(packageJsonPath, "utf-8");

      // Replace template placeholders with actual config values
      content = replaceTemplatePlaceholders(content, config);

      packageJson = JSON.parse(content);
    } catch (_error) {
      consola.warn("Could not parse existing package.json, creating new one");
    }
  }

  // Update package.json with project name (ensure it's set correctly)
  packageJson.name = config.name;

  if (!packageJson.version) {
    packageJson.version = "0.1.0";
  }

  if (!packageJson.private) {
    packageJson.private = true;
  }

  // Initialize package.json sections if they don't exist
  if (!packageJson.dependencies) packageJson.dependencies = {};
  if (!packageJson.devDependencies) packageJson.devDependencies = {};
  if (!packageJson.scripts) packageJson.scripts = {};

  // Merge _package.json from base template if it exists
  const basePackageJsonPath = join(
    baseTemplate.path,
    config.language,
    "_package.json"
  );
  if (existsSync(basePackageJsonPath)) {
    await mergePackageJson(packageJson, basePackageJsonPath);
  }

  // Merge _package.json from each selected package addon
  for (const addon of packageAddons) {
    const addonPackageJsonPath = join(
      addon.path,
      config.language,
      "_package.json"
    );
    if (existsSync(addonPackageJsonPath)) {
      await mergePackageJson(packageJson, addonPackageJsonPath);
    }
  }

  // Sort dependencies alphabetically
  if (
    packageJson.dependencies &&
    Object.keys(packageJson.dependencies).length > 0
  ) {
    packageJson.dependencies = sortObjectKeys(packageJson.dependencies);
  }

  if (
    packageJson.devDependencies &&
    Object.keys(packageJson.devDependencies).length > 0
  ) {
    packageJson.devDependencies = sortObjectKeys(packageJson.devDependencies);
  }

  if (packageJson.scripts && Object.keys(packageJson.scripts).length > 0) {
    packageJson.scripts = sortScripts(packageJson.scripts);
  }

  // Write updated package.json
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

/**
 * Merge a _package.json file into the main package.json
 */
async function mergePackageJson(
  targetPackageJson: any,
  packageJsonPath: string
): Promise<void> {
  try {
    const content = readFileSync(packageJsonPath, "utf-8");
    const sourcePackageJson = JSON.parse(content);

    // Merge dependencies
    if (sourcePackageJson.dependencies) {
      Object.assign(
        targetPackageJson.dependencies,
        sourcePackageJson.dependencies
      );
    }

    // Merge devDependencies
    if (sourcePackageJson.devDependencies) {
      Object.assign(
        targetPackageJson.devDependencies,
        sourcePackageJson.devDependencies
      );
    }

    // Merge scripts
    if (sourcePackageJson.scripts) {
      Object.assign(targetPackageJson.scripts, sourcePackageJson.scripts);
    }

    // Merge other fields (excluding name, version, description, license which should come from template)
    const excludedFields = [
      "name",
      "version",
      "description",
      "license",
      "dependencies",
      "devDependencies",
      "scripts",
    ];

    for (const [key, value] of Object.entries(sourcePackageJson)) {
      if (!excludedFields.includes(key)) {
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          // For objects, merge them
          if (!targetPackageJson[key]) targetPackageJson[key] = {};
          Object.assign(targetPackageJson[key], value);
        } else {
          // For primitives and arrays, overwrite
          targetPackageJson[key] = value;
        }
      }
    }
  } catch (error) {
    consola.warn(
      `Failed to merge package.json from ${packageJsonPath}: ${error}`
    );
  }
}

/**
 * Sort object keys alphabetically
 */
function sortObjectKeys(obj: Record<string, any>): Record<string, any> {
  const sorted: Record<string, any> = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    sorted[key] = obj[key];
  }

  return sorted;
}

/**
 * Sort scripts in a logical order: general scripts first, then prefixed scripts grouped together
 */
function sortScripts(scripts: Record<string, any>): Record<string, any> {
  const sorted: Record<string, any> = {};
  const keys = Object.keys(scripts);

  // Define order for common general scripts
  const generalScriptOrder = [
    "build",
    "dev",
    "start",
    "format",
    "lint",
    "test",
    "typecheck",
  ];

  // Separate general scripts and prefixed scripts
  const generalScripts: string[] = [];
  const prefixedScripts: Record<string, string[]> = {};

  for (const key of keys) {
    if (generalScriptOrder.includes(key)) {
      generalScripts.push(key);
    } else {
      const colonIndex = key.indexOf(":");
      if (colonIndex > 0) {
        const prefix = key.substring(0, colonIndex);
        if (!prefixedScripts[prefix]) {
          prefixedScripts[prefix] = [];
        }
        prefixedScripts[prefix].push(key);
      } else {
        // Other general scripts not in the predefined order
        generalScripts.push(key);
      }
    }
  }

  // Add general scripts in the predefined order
  for (const script of generalScriptOrder) {
    if (generalScripts.includes(script)) {
      sorted[script] = scripts[script];
    }
  }

  // Add other general scripts alphabetically
  const otherGeneralScripts = generalScripts
    .filter((script) => !generalScriptOrder.includes(script))
    .sort();

  for (const script of otherGeneralScripts) {
    sorted[script] = scripts[script];
  }

  // Add prefixed scripts grouped by prefix
  const sortedPrefixes = Object.keys(prefixedScripts).sort();
  for (const prefix of sortedPrefixes) {
    const prefixScripts = prefixedScripts[prefix].sort();
    for (const script of prefixScripts) {
      sorted[script] = scripts[script];
    }
  }

  return sorted;
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
    const { spawn } = await import("node:child_process");

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
