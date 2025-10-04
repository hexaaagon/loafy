import { exec } from "child_process";
import { promisify } from "util";
import { consola } from "consola";
import type { PackageManager } from "../helpers/get-pkg-manager.js";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getBuilderPackages } from "./template-registry.js";

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Fetch the latest version of a package from npm registry
 */
async function getLatestPackageVersion(packageName: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`npm view ${packageName} version`);
    const version = stdout.trim();
    return `^${version}`;
  } catch (error) {
    // If package not found or error, use latest
    console.warn(`Could not fetch version for ${packageName}, using latest`);
    return "latest";
  }
}

/**
 * Get the directory where builders should be installed
 * This should be relative to the CLI's installation location
 */
function getInstallDirectory(): string {
  // Install in the CLI's node_modules directory
  // This works for both global installs and local node_modules
  return join(__dirname, "..", "..", "..");
}

/**
 * Check if a builder package is already installed
 */
export function isBuilderInstalled(packageName: string): boolean {
  const possibleLocations = [
    // Check in current working directory
    join(process.cwd(), "node_modules", ...packageName.split("/")),
    // Check in CLI's node_modules
    join(
      __dirname,
      "..",
      "..",
      "..",
      "node_modules",
      ...packageName.split("/")
    ),
    join(__dirname, "..", "node_modules", ...packageName.split("/")),
  ];

  for (const location of possibleLocations) {
    if (existsSync(location)) {
      return true;
    }
  }

  // Try to resolve it as a last resort
  try {
    require.resolve(packageName);
    return true;
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
    const installDir = getInstallDirectory();

    if (process.env.VERBOSE || process.env.DEBUG) {
      console.log("Install directory:", installDir);
      console.log("Install directory exists:", existsSync(installDir));
      console.log("__dirname:", __dirname);
      console.log("process.cwd():", process.cwd());
    }

    let installCommand: string;

    switch (packageManager) {
      case "npm":
        installCommand = `cd "${installDir}" && npm install ${packagesToInstall.join(" ")} --no-save`;
        break;
      case "yarn":
        installCommand = `cd "${installDir}" && yarn add ${packagesToInstall.join(" ")} --ignore-workspace-root-check`;
        break;
      case "pnpm":
        installCommand = `cd "${installDir}" && pnpm add ${packagesToInstall.join(" ")} --no-save`;
        break;
      case "bun":
        installCommand = `cd "${installDir}" && bun add ${packagesToInstall.join(" ")} --no-save`;
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

    // Log where the builders were installed for debugging
    if (process.env.VERBOSE || process.env.DEBUG) {
      console.log("Builders installed in:", installDir);
      console.log("Checking if builders are now accessible:");
      packagesToInstall.forEach((pkg) => {
        const pkgName = pkg.split("@")[0]; // Remove version
        console.log(`  - ${pkgName}:`, isBuilderInstalled(pkgName));
      });
    }
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
  const { template, categories, packageAddons, templateVersion } =
    getBuilderPackages(templateName);

  // For version-specific packages, append the version
  const templatePkg =
    templateVersion && templateVersion !== "latest"
      ? `${template}@${templateVersion}`
      : template;
  const categoriesPkg =
    templateVersion && templateVersion !== "latest"
      ? `${categories}@${templateVersion}`
      : categories;

  const packagesToCheck = [template, categories, ...packageAddons];
  const packagesToInstall: string[] = [];

  // Check which packages are missing
  for (let i = 0; i < packagesToCheck.length; i++) {
    const pkg = packagesToCheck[i];
    if (!isBuilderInstalled(pkg)) {
      if (pkg === template) {
        packagesToInstall.push(templatePkg);
      } else if (pkg === categories) {
        packagesToInstall.push(categoriesPkg);
      } else {
        // Package addon - fetch its own version from npm
        const addonIndex = packageAddons.indexOf(pkg);
        if (addonIndex !== -1) {
          const addonVersion = await getLatestPackageVersion(pkg);
          const addonPkg =
            addonVersion !== "latest" ? `${pkg}@${addonVersion}` : pkg;
          packagesToInstall.push(addonPkg);
        }
      }
    }
  }

  if (packagesToInstall.length > 0) {
    consola.info(
      `Template "${templateName}" requires additional builders to be installed`
    );
    await installBuilders(packagesToInstall, packageManager);
  }
}
