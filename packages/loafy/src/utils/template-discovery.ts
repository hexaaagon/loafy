import { existsSync, readFileSync, readdirSync, type Dirent } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { glob } from "glob";
import type {
  BaseTemplate,
  PackageAddon,
  PackageCategory,
  TemplateConfig,
} from "../types/template.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try multiple possible locations for @loafy packages
function getLoafyPackagesDir(): {
  path: string;
  mode: "development" | "production";
} | null {
  const cacheDir = join(
    process.env.LOAFY_CACHE_DIR || join(homedir(), ".loafy", "builders"),
    "node_modules",
    "@loafy"
  );

  const possibilities = [
    // Development: monorepo workspace builders directory (highest priority for development)
    { path: join(process.cwd(), "builders"), mode: "development" as const },
    // Development: running from packages/loafy in monorepo
    {
      path: join(__dirname, "..", "..", "..", "..", "builders"),
      mode: "development" as const,
    },
    // Production: Global cache directory (HIGHEST PRIORITY for production - installed builders)
    // This must be checked before CLI's own node_modules to avoid using bundled/stale builders
    {
      path: cacheDir,
      mode: "production" as const,
    },
    // Production: installed packages in current working directory node_modules
    {
      path: join(process.cwd(), "node_modules", "@loafy"),
      mode: "production" as const,
    },
    // Production: CLI's own node_modules (when globally installed or via bun create)
    // Lower priority than cache to ensure fresh builders are used
    // SKIP if we're running from a temp bunx directory to avoid using incomplete bundled builders
    {
      path: join(__dirname, "..", "..", "..", "node_modules", "@loafy"),
      mode: "production" as const,
      skipIfTemp: true,
    },
    // Production: One level up from CLI location (alternative global install)
    {
      path: join(__dirname, "..", "..", "..", "..", "node_modules", "@loafy"),
      mode: "production" as const,
      skipIfTemp: true,
    },
    // Production: Resolve from the CLI's package location
    {
      path: join(__dirname, "..", "node_modules", "@loafy"),
      mode: "production" as const,
      skipIfTemp: true,
    },
  ];

  // Check if we're running from a temp directory (bunx, npx, etc.)
  const isTempDir =
    __dirname.includes("Temp") ||
    __dirname.includes("tmp") ||
    __dirname.includes("bunx-") ||
    __dirname.includes("npx-");

  for (const option of possibilities) {
    // Skip CLI's own node_modules if we're in a temp directory
    // This prevents using incomplete/bundled builders
    if (option.skipIfTemp && isTempDir && option.path !== cacheDir) {
      if (process.env.VERBOSE || process.env.DEBUG) {
        console.log(`Skipping temp CLI directory: ${option.path}`);
      }
      continue;
    }

    if (existsSync(option.path)) {
      if (process.env.VERBOSE || process.env.DEBUG) {
        console.log(
          `Found @loafy packages in: ${option.path} (${option.mode} mode)`
        );
      }
      return option;
    }
  }

  if (process.env.VERBOSE || process.env.DEBUG) {
    console.log("No @loafy packages found in any of the checked locations");
  }

  // Return null instead of throwing - builders might not be installed yet
  return null;
}

// Development mode: scan builders/ directory structure
async function discoverDevelopmentPackages(
  buildersDir: string,
  baseTemplates: BaseTemplate[],
  packageAddons: PackageAddon[],
  categories: Map<string, PackageCategory[]>,
  categoryPackages: string[]
): Promise<void> {
  // Scan template/ directory for base templates
  const templateDir = join(buildersDir, "template");
  if (existsSync(templateDir)) {
    const templateDirs = readdirSync(templateDir, { withFileTypes: true })
      .filter(
        (dirent: Dirent) => dirent.isDirectory() && !dirent.name.startsWith("_")
      )
      .map((dirent: Dirent) => join(templateDir, dirent.name));

    for (const packageDir of templateDirs) {
      const configPath = join(packageDir, "config.json");
      if (!existsSync(configPath)) continue;

      try {
        const config = await loadConfig(configPath);
        const packageName = basename(packageDir);
        const templatesPath = join(packageDir, "templates");

        if (!existsSync(templatesPath)) {
          console.warn(
            `Template package ${packageName} is missing templates directory`
          );
          continue;
        }

        baseTemplates.push({
          id: config.id,
          name: packageName,
          title: config.title,
          description: config.description,
          ready: config.ready,
          path: templatesPath,
        });
      } catch (error) {
        console.warn(
          `Failed to load template config from ${configPath}: ${error}`
        );
      }
    }
  }

  // Scan packages/ directory for package addons
  const packagesDir = join(buildersDir, "packages");
  if (existsSync(packagesDir)) {
    // Use glob to find all config.json files recursively
    const configFiles = await glob("**/config.json", {
      cwd: packagesDir,
      absolute: true,
      ignore: ["**/_*/**", "**/node_modules/**"], // Ignore template scaffolds and node_modules
    });

    for (const configPath of configFiles) {
      const packageDir = dirname(configPath);
      const packageName = basename(packageDir);

      // Skip template scaffolds
      if (packageName.startsWith("_")) continue;

      try {
        const config = await loadConfig(configPath);
        const templatesPath = join(packageDir, "templates");

        if (!existsSync(templatesPath)) {
          console.warn(
            `Package addon ${packageName} is missing templates directory`
          );
          continue;
        }

        packageAddons.push({
          id: config.id,
          name: packageName,
          title: config.title,
          description: config.description,
          category: config.category || "extras",
          categoryUuid: config.categoryUuid || "",
          ready: config.ready,
          conflict: config.conflict || [],
          needed: config.needed || [],
          path: templatesPath,
          baseTemplate: config.baseTemplate || "unknown",
          baseTemplateUuid: config.baseTemplateUuid || "",
        });
      } catch (error) {
        console.warn(
          `Failed to load package config from ${configPath}: ${error}`
        );
      }
    }
  }

  // Scan categories/ directory for category definitions
  const categoriesDir = join(buildersDir, "categories");
  if (existsSync(categoriesDir)) {
    const categoryPackageDirs = readdirSync(categoriesDir, {
      withFileTypes: true,
    })
      .filter(
        (dirent: Dirent) => dirent.isDirectory() && !dirent.name.startsWith("_")
      )
      .map((dirent: Dirent) => join(categoriesDir, dirent.name));

    for (const packageDir of categoryPackageDirs) {
      const packageName = basename(packageDir);
      const categoriesSubDir = join(packageDir, "categories");
      if (!existsSync(categoriesSubDir)) continue;

      // Track this category package
      categoryPackages.push(packageName);

      const categoryFiles = await glob("*.json", {
        cwd: categoriesSubDir,
        absolute: true,
      });

      for (const categoryFile of categoryFiles) {
        try {
          const categoryContent = readFileSync(categoryFile, "utf-8");
          const templateCategories: PackageCategory[] =
            JSON.parse(categoryContent);
          const templateName = basename(categoryFile, ".json");
          categories.set(templateName, templateCategories);
        } catch (error) {
          console.warn(
            `Failed to load category from ${categoryFile}: ${error}`
          );
        }
      }
    }
  }
}

// Production mode: scan node_modules/@loafy/ directory
async function discoverProductionPackages(
  loafyDir: string,
  baseTemplates: BaseTemplate[],
  packageAddons: PackageAddon[],
  categories: Map<string, PackageCategory[]>,
  categoryPackages: string[]
): Promise<void> {
  const packageDirs = readdirSync(loafyDir, { withFileTypes: true })
    .filter(
      (dirent: Dirent) => dirent.isDirectory() && !dirent.name.startsWith("_")
    )
    .map((dirent: Dirent) => join(loafyDir, dirent.name));

  if (process.env.VERBOSE || process.env.DEBUG) {
    console.log("Scanning @loafy directory:", loafyDir);
    const foundDirs = readdirSync(loafyDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    console.log("Found package directories:", foundDirs);
  }

  for (const packageDir of packageDirs) {
    const configPath = join(packageDir, "config.json");
    const packageName = basename(packageDir);

    if (process.env.VERBOSE || process.env.DEBUG) {
      console.log(`\nChecking package: ${packageName}`);
      console.log(`  Config path: ${configPath}`);
      console.log(`  Config exists: ${existsSync(configPath)}`);
    }

    if (!existsSync(configPath)) {
      continue;
    }

    try {
      const config = await loadConfig(configPath);

      // Determine package type by name prefix
      if (
        packageName.startsWith("template-") ||
        packageName.startsWith("builders-") ||
        packageName === "nextjs" ||
        packageName === "expo"
      ) {
        const templatesPath = join(packageDir, "templates");

        if (process.env.VERBOSE || process.env.DEBUG) {
          console.log(`  Identified as template package`);
          console.log(`  Templates path: ${templatesPath}`);
          console.log(`  Templates exists: ${existsSync(templatesPath)}`);
        }

        if (!existsSync(templatesPath)) {
          console.warn(
            `Template package ${packageName} is missing templates directory`
          );
          continue;
        }

        baseTemplates.push({
          id: config.id,
          name: packageName.replace("template-", "").replace("builders-", ""),
          title: config.title,
          description: config.description,
          ready: config.ready,
          path: templatesPath,
        });

        if (process.env.VERBOSE || process.env.DEBUG) {
          console.log(`  ✓ Added template: ${config.title}`);
        }
      } else if (packageName.startsWith("categories-")) {
        // Categories package: @loafy/categories-web
        const categoriesDir = join(packageDir, "categories");

        if (!existsSync(categoriesDir)) {
          console.warn(
            `Categories package ${packageName} is missing categories directory`
          );
          continue;
        }

        categoryPackages.push(packageName.replace("categories-", ""));

        const categoryFiles = await glob("*.json", {
          cwd: categoriesDir,
          absolute: true,
        });

        for (const categoryFile of categoryFiles) {
          try {
            const categoryContent = readFileSync(categoryFile, "utf-8");
            const templateCategories: PackageCategory[] =
              JSON.parse(categoryContent);
            const templateName = basename(categoryFile, ".json");
            categories.set(templateName, templateCategories);
          } catch (error) {
            console.warn(
              `Failed to load category from ${categoryFile}: ${error}`
            );
          }
        }
      } else {
        const templatesPath = join(packageDir, "templates");

        if (!existsSync(templatesPath)) {
          console.warn(
            `Package addon ${packageName} is missing templates directory`
          );
          continue;
        }

        packageAddons.push({
          id: config.id,
          name: packageName,
          title: config.title,
          description: config.description,
          category: config.category || "extras",
          categoryUuid: config.categoryUuid || "",
          ready: config.ready,
          conflict: config.conflict || [],
          needed: config.needed || [],
          path: templatesPath,
          baseTemplate: config.baseTemplate || "unknown",
          baseTemplateUuid: config.baseTemplateUuid || "",
        });
      }
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}: ${error}`);
    }
  }
}

export async function discoverTemplates(specifiedBuilders?: string[]): Promise<{
  baseTemplates: BaseTemplate[];
  packageAddons: PackageAddon[];
  categories: Map<string, PackageCategory[]>; // baseTemplate -> categories
  categoryPackages: string[]; // List of category package names (e.g., "web")
}> {
  const baseTemplates: BaseTemplate[] = [];
  const packageAddons: PackageAddon[] = [];
  const categories: Map<string, PackageCategory[]> = new Map();
  const categoryPackages: string[] = [];

  const loafyDir = getLoafyPackagesDir();

  // If no builders found, return empty arrays
  if (!loafyDir) {
    if (process.env.VERBOSE || process.env.DEBUG) {
      console.warn(
        "Attempted to find @loafy builders in the following locations:"
      );
      console.warn("- " + join(process.cwd(), "builders"));
      console.warn("- " + join(__dirname, "..", "..", "..", "..", "builders"));
      console.warn("- " + join(process.cwd(), "node_modules", "@loafy"));
      console.warn(
        "- " + join(__dirname, "..", "..", "..", "node_modules", "@loafy")
      );
      console.warn(
        "- " + join(__dirname, "..", "..", "..", "..", "node_modules", "@loafy")
      );
      console.warn("- " + join(__dirname, "..", "node_modules", "@loafy"));
      console.warn("\nCurrent working directory:", process.cwd());
      console.warn("CLI __dirname:", __dirname);
    }
    console.warn(
      "No @loafy builders found. They will be installed when you select a template."
    );
    return { baseTemplates, packageAddons, categories, categoryPackages };
  }

  const { path: LOAFY_PACKAGES_DIR, mode } = loafyDir;

  if (process.env.VERBOSE || process.env.DEBUG) {
    console.log(
      "Found @loafy packages in:",
      LOAFY_PACKAGES_DIR,
      `(${mode} mode)`
    );
  }

  try {
    if (mode === "development") {
      // Development mode: scan builders/template/, builders/packages/, builders/categories/
      await discoverDevelopmentPackages(
        LOAFY_PACKAGES_DIR,
        baseTemplates,
        packageAddons,
        categories,
        categoryPackages
      );
    } else {
      // Production mode: scan node_modules/@loafy/
      await discoverProductionPackages(
        LOAFY_PACKAGES_DIR,
        baseTemplates,
        packageAddons,
        categories,
        categoryPackages
      );
    }
  } catch (error) {
    throw new Error(`Failed to discover @loafy packages: ${error}`);
  }

  // Set default categories for templates that don't have categories loaded
  for (const template of baseTemplates) {
    if (!categories.has(template.name)) {
      categories.set(template.name, [
        {
          id: "extras",
          uuid: "f7b2c1d5-3e6a-7b4c-2f8d-9a5e1c3b7d4f",
          title: "Extras",
          description: "Additional utilities",
          order: 1,
        },
      ]);
    }
  }

  return { baseTemplates, packageAddons, categories, categoryPackages };
}

async function loadConfig(configPath: string): Promise<TemplateConfig> {
  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse JSON config from ${configPath}: ${error}`);
  }
}

export function getAvailablePackages(
  baseTemplate: string,
  packageAddons: PackageAddon[]
): PackageAddon[] {
  return packageAddons.filter((addon) => addon.baseTemplate === baseTemplate);
}

export function validatePackageSelection(
  selectedPackages: string[],
  packageAddons: PackageAddon[]
): { valid: boolean; conflicts: string[] } {
  const conflicts: string[] = [];
  const packageMap = new Map(packageAddons.map((addon) => [addon.id, addon]));

  for (const packageId of selectedPackages) {
    const packageAddon = packageMap.get(packageId);
    if (!packageAddon) continue;

    for (const conflictId of packageAddon.conflict) {
      if (selectedPackages.includes(conflictId)) {
        const conflictPackage = packageMap.get(conflictId);
        conflicts.push(
          `${packageAddon.title} conflicts with ${conflictPackage?.title || conflictId}`
        );
      }
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
  };
}
