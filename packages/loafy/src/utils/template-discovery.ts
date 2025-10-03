import { existsSync, readFileSync, readdirSync, type Dirent } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
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
  const possibilities = [
    // Development: monorepo workspace builders directory
    { path: join(process.cwd(), "builders"), mode: "development" as const },
    // Development: running from packages/loafy in monorepo
    {
      path: join(__dirname, "..", "..", "..", "..", "builders"),
      mode: "development" as const,
    },
    // Production: installed packages in node_modules
    {
      path: join(process.cwd(), "node_modules", "@loafy"),
      mode: "production" as const,
    },
    // Production: CLI installed globally or in different location
    {
      path: join(__dirname, "..", "..", "..", "node_modules", "@loafy"),
      mode: "production" as const,
    },
  ];

  for (const option of possibilities) {
    if (existsSync(option.path)) {
      return option;
    }
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

  for (const packageDir of packageDirs) {
    const configPath = join(packageDir, "config.json");

    if (!existsSync(configPath)) {
      continue;
    }

    try {
      const config = await loadConfig(configPath);
      const packageName = basename(packageDir);

      // Determine package type by name prefix
      if (
        packageName.startsWith("template-") ||
        packageName === "nextjs" ||
        packageName === "expo"
      ) {
        const templatesPath = join(packageDir, "templates");

        if (!existsSync(templatesPath)) {
          console.warn(
            `Template package ${packageName} is missing templates directory`
          );
          continue;
        }

        baseTemplates.push({
          id: config.id,
          name: packageName.replace("template-", ""),
          title: config.title,
          description: config.description,
          ready: config.ready,
          path: templatesPath,
        });
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
    console.warn(
      "No @loafy builders found. They will be installed when you select a template."
    );
    return { baseTemplates, packageAddons, categories, categoryPackages };
  }

  const { path: LOAFY_PACKAGES_DIR, mode } = loafyDir;

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
