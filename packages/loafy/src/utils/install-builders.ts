import { exec } from "child_process";
import { promisify } from "util";
import { consola } from "consola";
import semver from "semver";
import type { PackageManager } from "../helpers/get-pkg-manager.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
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
 * Uses a global cache directory to avoid polluting user's working directory
 */
function getInstallDirectory(): string {
  // Use platform-specific cache directory
  const cacheDir =
    process.env.LOAFY_CACHE_DIR || join(homedir(), ".loafy", "builders");

  // Ensure the directory exists
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  // Ensure package.json exists for package managers
  const packageJsonPath = join(cacheDir, "package.json");
  if (!existsSync(packageJsonPath)) {
    const packageJson = {
      name: "loafy-builders-cache",
      version: "1.0.0",
      private: true,
      description: "Cache directory for Loafy builder packages",
    };
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  return cacheDir;
}

/**
 * Get the installed version of a builder package
 */
function getInstalledVersion(packageName: string): string | null {
  const installDir = getInstallDirectory();
  const packageJsonPath = join(
    installDir,
    "node_modules",
    ...packageName.split("/"),
    "package.json"
  );

  if (process.env.VERBOSE || process.env.DEBUG) {
    console.log(`Checking for package: ${packageName}`);
    console.log(`  Path: ${packageJsonPath}`);
    console.log(`  Exists: ${existsSync(packageJsonPath)}`);
  }

  if (!existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version || null;
  } catch (error) {
    if (process.env.VERBOSE || process.env.DEBUG) {
      console.warn(`Failed to read version for ${packageName}:`, error);
    }
    return null;
  }
}

/**
 * Check if a builder package is installed with the correct version
 * @param packageName - The package name (e.g., "@loafy/builders-nextjs")
 * @param requiredVersion - The required version range (e.g., "^0.2.0") or "latest"
 */
export function isBuilderInstalled(
  packageName: string,
  requiredVersion?: string
): boolean {
  const installedVersion = getInstalledVersion(packageName);

  if (!installedVersion) {
    return false;
  }

  // If no version requirement or "latest", just check existence
  if (!requiredVersion || requiredVersion === "latest") {
    return true;
  }

  // Validate version against the required range
  try {
    const satisfies = semver.satisfies(installedVersion, requiredVersion);

    if (!satisfies && (process.env.VERBOSE || process.env.DEBUG)) {
      console.log(
        `Package ${packageName}: installed version ${installedVersion} does not satisfy ${requiredVersion}`
      );
    }

    return satisfies;
  } catch (error) {
    if (process.env.VERBOSE || process.env.DEBUG) {
      console.warn(`Failed to validate version for ${packageName}:`, error);
    }
    // If version validation fails, assume it needs reinstall
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
  // Extract package names without version specifiers for checking
  const packageNames = packages.map((pkg) =>
    pkg.split("@")[0] === ""
      ? "@" + pkg.split("@")[1] // Scoped package like @loafy/...
      : pkg.split("@")[0]
  );

  const packagesToInstall = packages.filter((pkg, index) => {
    const pkgName = packageNames[index];
    // Extract version from package string (e.g., "@loafy/builders-nextjs@^0.2.0")
    const versionMatch = pkg.match(/@([\^~]?[\d.]+(?:-[\w.]+)?)$/);
    const requiredVersion = versionMatch ? versionMatch[1] : undefined;
    return !isBuilderInstalled(pkgName, requiredVersion);
  });

  if (packagesToInstall.length === 0) {
    if (process.env.VERBOSE || process.env.DEBUG) {
      consola.info(
        "All required builders are already installed with compatible versions"
      );
    }
    return;
  }

  if (process.env.VERBOSE || process.env.DEBUG) {
    consola.start(
      `Installing required builders: ${packagesToInstall.join(", ")}`
    );
  }

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
        installCommand = `npm install ${packagesToInstall.join(" ")} --no-save`;
        break;
      case "yarn":
        installCommand = `yarn add ${packagesToInstall.join(" ")} --ignore-workspace-root-check`;
        break;
      case "pnpm":
        // pnpm doesn't support --no-save, use --save-dev=false instead
        installCommand = `pnpm add ${packagesToInstall.join(" ")} --save-dev=false --save-optional=false --save-peer=false`;
        break;
      case "bun":
        installCommand = `bun add ${packagesToInstall.join(" ")} --no-save`;
        break;
      default:
        throw new Error(`Unsupported package manager: ${packageManager}`);
    }

    if (process.env.VERBOSE || process.env.DEBUG) {
      console.log("Install command:", installCommand);
      console.log("Working directory:", installDir);
    }

    const { stdout, stderr } = await execAsync(installCommand, {
      cwd: installDir,
    });

    if (process.env.VERBOSE || process.env.DEBUG) {
      if (stdout) console.log("stdout:", stdout);
      if (stderr) console.log("stderr:", stderr);
    }

    if (stderr && !stderr.includes("WARN")) {
      consola.warn("Installation warnings:", stderr);
    }

    if (process.env.VERBOSE || process.env.DEBUG) {
      consola.success(
        `Successfully installed builders: ${packagesToInstall.join(", ")}`
      );
    }

    // Log where the builders were installed for debugging
    if (process.env.VERBOSE || process.env.DEBUG) {
      console.log("Builders installed in:", installDir);
      console.log("Checking if builders are now accessible:");
      packagesToInstall.forEach((pkg) => {
        // Extract package name from @loafy/builders-nextjs@^0.2.1
        const pkgName = pkg.includes("@", 1)
          ? pkg.substring(0, pkg.lastIndexOf("@")) // Remove version
          : pkg; // No version specified
        console.log(`  - ${pkgName}:`, isBuilderInstalled(pkgName));
      });
    }
  } catch (error: any) {
    if (process.env.VERBOSE || process.env.DEBUG) {
      console.error("Installation error details:");
      console.error("  Error:", error.message);
      if (error.stdout) console.error("  stdout:", error.stdout);
      if (error.stderr) console.error("  stderr:", error.stderr);
    }
    
    consola.error("Failed to install builders:", error.message);
    if (error.stderr) {
      consola.error("Error details:", error.stderr);
    }
    
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

  // Check which packages are missing or have incompatible versions
  for (let i = 0; i < packagesToCheck.length; i++) {
    const pkg = packagesToCheck[i];
    let needsInstall = false;

    if (pkg === template || pkg === categories) {
      // Check version compatibility for template and categories
      needsInstall = !isBuilderInstalled(pkg, templateVersion);
    } else {
      // Package addons - fetch latest version and check compatibility
      const addonVersion = await getLatestPackageVersion(pkg);
      needsInstall = !isBuilderInstalled(pkg, addonVersion);
    }

    if (needsInstall) {
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
