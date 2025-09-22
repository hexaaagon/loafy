import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";
import type {
  BaseTemplate,
  PackageAddon,
  PackageCategory,
  TemplateConfig,
} from "../types/template.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try multiple possible template directories
function getTemplatesDir(): string {
  const possibilities = [
    // Development: running from src/
    join(__dirname, "..", "..", "src", "templates"),
    // Built: running from dist/
    join(__dirname, "..", "..", "templates"),
    // Built: running from dist/ but templates copied to dist/
    join(__dirname, "..", "templates"),
    // Development: running from project root
    join(process.cwd(), "src", "templates"),
    // Package: installed as dependency
    join(__dirname, "..", "..", "..", "templates"),
  ];

  for (const path of possibilities) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error(
    `Templates directory not found. Tried: ${possibilities.join(", ")}`
  );
}

export async function discoverTemplates(): Promise<{
  baseTemplates: BaseTemplate[];
  packageAddons: PackageAddon[];
  categories: Map<string, PackageCategory[]>; // baseTemplate -> categories
}> {
  const baseTemplates: BaseTemplate[] = [];
  const packageAddons: PackageAddon[] = [];
  const categories: Map<string, PackageCategory[]> = new Map();

  const TEMPLATES_DIR = getTemplatesDir();

  try {
    // Find all config.json files in the templates directory
    const configFiles = await glob("**/config.json", {
      cwd: TEMPLATES_DIR,
      absolute: true,
    });

    for (const configPath of configFiles) {
      try {
        const config = await loadConfig(configPath);
        const relativePath = configPath
          .replace(TEMPLATES_DIR, "")
          .replace(/^[\\\/]/, "");
        const parts = relativePath.split(/[\\\/]/);

        if (parts.length === 3 && parts[1] === "app") {
          // This is a base template: templates/nextjs/app/config.json
          const templateName = parts[0];
          const templatePath = join(TEMPLATES_DIR, templateName, "app");

          baseTemplates.push({
            id: config.id,
            name: templateName,
            title: config.title,
            description: config.description,
            ready: config.ready,
            path: templatePath,
          });
        } else if (parts.length === 4 && parts[1] === "packages") {
          // This is a package addon: templates/nextjs/packages/supabase/config.json
          const templateName = parts[0];
          const packageName = parts[2];
          const packagePath = join(
            TEMPLATES_DIR,
            templateName,
            "packages",
            packageName
          );

          packageAddons.push({
            id: config.id,
            name: packageName,
            title: config.title,
            description: config.description,
            category: config.category || "extras", // Default to extras if no category specified
            ready: config.ready,
            conflict: config.conflict,
            needed: config.needed || [], // Default to empty array if not specified
            version: config.version,
            path: packagePath,
            baseTemplate: templateName,
          });
        }
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}: ${error}`);
      }
    }
  } catch (error) {
    throw new Error(`Failed to discover templates: ${error}`);
  }

  // Load categories for each base template
  for (const template of baseTemplates) {
    const categoryPath = join(
      TEMPLATES_DIR,
      template.name,
      "packages",
      "category.json"
    );
    if (existsSync(categoryPath)) {
      try {
        const categoryContent = readFileSync(categoryPath, "utf-8");
        const templateCategories: PackageCategory[] =
          JSON.parse(categoryContent);
        categories.set(template.name, templateCategories);
      } catch (error) {
        console.warn(
          `Failed to load categories from ${categoryPath}: ${error}`
        );
        // Set default categories if loading fails
        categories.set(template.name, [
          {
            id: "extras",
            title: "Extras",
            description: "Additional utilities",
            order: 1,
          },
        ]);
      }
    } else {
      // Set default categories if file doesn't exist
      categories.set(template.name, [
        {
          id: "extras",
          title: "Extras",
          description: "Additional utilities",
          order: 1,
        },
      ]);
    }
  }

  return { baseTemplates, packageAddons, categories };
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
