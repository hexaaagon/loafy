import { exec } from "child_process";
import { promisify } from "util";
import { consola } from "consola";
import type { PackageManager } from "../helpers/get-pkg-manager.js";
import { existsSync } from "fs";
import { join } from "path";
import { getBuilderPackages } from "./template-registry.js";

const execAsync = promisify(exec);

/**
 * Check if a builder package is already installed
 */
export function isBuilderInstalled(packageName: string): boolean {
  try {
    // Check in node_modules
    const nodeModulesPath = join(
      process.cwd(),
      "node_modules",
      ...packageName.split("/")
    );
    if (existsSync(nodeModulesPath)) {
      return true;
    }

    // Check if we can resolve it
    try {
      require.resolve(packageName);
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Install builder packages dynamically
 */
export async function installBuilders(
  packages: string[],
  packageManager: PackageManager
): Promise<void> {
  const packagesToInstall = packages.filter((pkg) => !isBuilderInstalled(pkg));

  if (packagesToInstall.length === 0) {
    consola.info("All required builders are already installed");
    return;
  }

  consola.start(
    `Installing required builders: ${packagesToInstall.join(", ")}`
  );

  try {
    let installCommand: string;

    switch (packageManager) {
      case "npm":
        installCommand = `npm install ${packagesToInstall.join(" ")} --save-dev`;
        break;
      case "yarn":
        installCommand = `yarn add ${packagesToInstall.join(" ")} --dev`;
        break;
      case "pnpm":
        installCommand = `pnpm add ${packagesToInstall.join(" ")} --save-dev`;
        break;
      case "bun":
        installCommand = `bun add ${packagesToInstall.join(" ")} --dev`;
        break;
      default:
        throw new Error(`Unsupported package manager: ${packageManager}`);
    }

    const { stdout, stderr } = await execAsync(installCommand);

    if (stderr && !stderr.includes("WARN")) {
      consola.warn("Installation warnings:", stderr);
    }

    consola.success(
      `Successfully installed builders: ${packagesToInstall.join(", ")}`
    );
  } catch (error) {
    consola.error("Failed to install builders:", error);
    throw new Error(
      `Failed to install required builders. Please install them manually: ${packagesToInstall.join(", ")}`
    );
  }
}

/**
 * Ensure required builders are installed for the selected template
 */
export async function ensureBuildersInstalled(
  templateName: string,
  packageManager: PackageManager
): Promise<void> {
  const { template, categories, version } = getBuilderPackages(templateName);

  // For version-specific packages, append the version
  const templatePkg =
    version && version !== "latest" ? `${template}@${version}` : template;
  const categoriesPkg =
    version && version !== "latest" ? `${categories}@${version}` : categories;

  const packagesToCheck = [template, categories];
  const packagesToInstall: string[] = [];

  // Check which packages are missing
  for (const pkg of packagesToCheck) {
    if (!isBuilderInstalled(pkg)) {
      packagesToInstall.push(pkg === template ? templatePkg : categoriesPkg);
    }
  }

  if (packagesToInstall.length > 0) {
    consola.info(
      `Template "${templateName}" requires additional builders to be installed`
    );
    await installBuilders(packagesToInstall, packageManager);
  }
}
