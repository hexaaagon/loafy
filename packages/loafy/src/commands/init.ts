import { Command } from "commander";
import { consola } from "consola";
import type { InitialReturnValue } from "prompts";
import prompts from "prompts";
import { basename, resolve } from "path";
import { existsSync } from "fs";

import {
  discoverTemplates,
  getAvailablePackages,
} from "../utils/template-discovery.js";
import type {
  BaseTemplate,
  PackageAddon,
  PackageCategory,
  ProjectConfig,
  Language,
} from "../types/template.js";
import { validateNpmName } from "../utils/validate-pkg.js";
import { isFolderEmpty } from "../utils/is-folder-empty.js";
import { createProject } from "../utils/create-project.js";
import { ensureBuildersInstalled } from "../utils/install-builders.js";
import { AVAILABLE_TEMPLATES } from "../utils/template-registry.js";

import type { PackageManager } from "../helpers/get-pkg-manager.js";
import {
  getPkgManager,
  getInstalledPackageManagers,
} from "../helpers/get-pkg-manager.js";

const onPromptState = (state: {
  value: InitialReturnValue;
  aborted: boolean;
  exited: boolean;
}) => {
  if (state.aborted) {
    process.stdout.write("\x1B[?25h");
    process.stdout.write("\n");
    process.exit(1);
  }
};

// Helper function for verbose logging
const verboseLog = (
  verbose: boolean | undefined,
  message: string,
  data?: any
) => {
  if (verbose) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

export async function initProject(options: {
  packageManager?: PackageManager;
  headless?: boolean;
  skipInstall?: boolean;
  projectName?: string;
  builders?: string[];
  verbose?: boolean;
}) {
  try {
    // Enable verbose/debug mode if requested
    if (options.verbose) {
      process.env.VERBOSE = "true";
      process.env.DEBUG = "true";
    }

    // Step 1: Show available templates from registry (hardcoded list)
    const templatesFromRegistry = AVAILABLE_TEMPLATES.map((t) => ({
      ...t,
      path: "", // Will be filled after builders are installed
    }));

    if (templatesFromRegistry.length === 0) {
      consola.error("No templates available!");
      process.exit(1);
    }

    // Get project name
    let projectPath = "";

    if (options.projectName) {
      projectPath = options.projectName;
    } else if (!options.headless) {
      const { path } = await prompts({
        onState: onPromptState,
        type: "text",
        name: "path",
        message: "What is your project named?",
        initial: "my-loafy-app",
        validate: (name: string) => {
          const validation = validateNpmName(basename(resolve(name)));
          if (validation.valid) {
            return true;
          }
          return "Invalid project name: " + validation.problems![0];
        },
      });

      if (typeof path === "string") {
        projectPath = path.trim();
      }
    } else {
      projectPath = "my-loafy-app";
    }

    if (!projectPath) {
      consola.error("Please specify a project name");
      process.exit(1);
    }

    // Resolve the project path and extract the directory name
    const appPath = resolve(projectPath);
    const appName = basename(appPath);

    // Log the resolved project information for clarity
    if (projectPath !== appName) {
      consola.info(`Creating project in: ${appPath}`);
      consola.info(`Project name will be: ${appName}`);
    }

    // Validate project name
    const validation = validateNpmName(appName);
    if (!validation.valid) {
      consola.error(
        `Could not create a project called "${appName}" because of npm naming restrictions:`
      );
      validation.problems!.forEach((p: string) => consola.error(`  * ${p}`));
      process.exit(1);
    }

    // Check if directory exists and is empty
    if (existsSync(appPath) && !isFolderEmpty(appPath, appName)) {
      process.exit(1);
    }

    // Select package manager
    const packageManager = await selectPackageManager(
      options.packageManager,
      options.headless
    );

    // Step 2: Select base template from registry
    const selectedTemplateFromRegistry = await selectBaseTemplate(
      templatesFromRegistry,
      options.headless
    );
    if (!selectedTemplateFromRegistry) {
      consola.error("No template selected");
      process.exit(1);
    }

    // Step 3: Ensure required builders are installed for the selected template
    try {
      await ensureBuildersInstalled(
        selectedTemplateFromRegistry.name,
        packageManager
      );
    } catch (error) {
      consola.error("Failed to install required builders:", error);
      consola.info(
        "You can manually install the required packages and try again."
      );
      process.exit(1);
    }

    // Step 4: Now discover templates and packages from installed builders
    const { baseTemplates, packageAddons, categories, categoryPackages } =
      await discoverTemplates(options.builders);

    if (options.verbose) {
      console.log("DISCOVERY DEBUG:");
      console.log(
        "- Base templates found:",
        baseTemplates.length,
        baseTemplates.map((t) => ({
          name: t.name,
          title: t.title,
          ready: t.ready,
        }))
      );
      console.log(
        "- Package addons found:",
        packageAddons.length,
        packageAddons.map((p) => ({
          name: p.name,
          title: p.title,
          ready: p.ready,
          baseTemplate: p.baseTemplate,
        }))
      );
      console.log(
        "- Category packages loaded:",
        categoryPackages.length,
        categoryPackages
      );
      console.log(
        "- Templates with categories:",
        categories.size,
        Array.from(categories.keys())
      );
    }

    // Find the actual template with path from discovered templates
    const selectedTemplate = baseTemplates.find(
      (t) => t.name === selectedTemplateFromRegistry.name
    );

    if (!selectedTemplate) {
      consola.error(
        `Failed to load template "${selectedTemplateFromRegistry.name}" after installing builders`
      );
      process.exit(1);
    }

    // Select language
    const language = await selectLanguage(options.headless);

    // Select package addons
    const availablePackages = getAvailablePackages(
      selectedTemplate.name,
      packageAddons
    );

    const templateCategories = categories.get(selectedTemplate.name) || [];
    const selectedPackages = await selectPackages(
      availablePackages,
      templateCategories,
      options.headless,
      options.verbose
    );

    const config: ProjectConfig = {
      name: appName,
      baseTemplate: selectedTemplate.name,
      language,
      packages: selectedPackages,
      packageManager,
    };

    await createProject(appPath, config, {
      baseTemplate: selectedTemplate,
      packageAddons: packageAddons.filter((addon) =>
        selectedPackages.includes(addon.id)
      ),
      skipInstall: options.skipInstall || false,
    });

    consola.success(`Successfully created ${appName}!`);
  } catch (error) {
    consola.error("Failed to initialize project:", error);
    process.exit(1);
  }
}

async function selectBaseTemplate(
  baseTemplates: BaseTemplate[],
  headless = false
): Promise<BaseTemplate | null> {
  if (headless) {
    const readyTemplate = baseTemplates.find((template) => template.ready);
    if (readyTemplate) {
      consola.info(`Selected template: ${readyTemplate.title}`);
      return readyTemplate;
    } else {
      consola.error("No ready templates available");
      return null;
    }
  }

  // Sort templates: available first (A-Z), then unavailable (A-Z)
  const availableTemplates = baseTemplates
    .filter((template) => template.ready)
    .sort((a, b) => a.title.localeCompare(b.title));

  const unavailableTemplates = baseTemplates
    .filter((template) => !template.ready)
    .map((template) => ({
      ...template,
      title: `${template.title} (upcoming) 🚧`,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const sortedTemplates = [...availableTemplates, ...unavailableTemplates];

  const choices = sortedTemplates.map((template) => ({
    title: template.title,
    description: template.description,
    value: template,
    disabled: !template.ready,
  }));

  const { template } = await prompts({
    onState: onPromptState,
    type: "select",
    name: "template",
    message: "Which template would you like to use?",
    choices,
    initial: 0,
  });

  return template || null;
}

async function selectLanguage(headless = false): Promise<Language> {
  if (headless) {
    consola.info("Selected language: TypeScript");
    return "ts";
  }

  const { language } = await prompts({
    onState: onPromptState,
    type: "select",
    name: "language",
    message: "Which language would you like to use?",
    choices: [
      { title: "TypeScript", description: "Recommended", value: "ts" },
      { title: "JavaScript", value: "js" },
    ],
    initial: 0,
  });

  return language || "ts";
}

async function selectPackageManager(
  providedPackageManager?: PackageManager,
  headless = false
): Promise<PackageManager> {
  if (providedPackageManager) {
    return providedPackageManager;
  }

  if (headless) {
    const detected = getPkgManager();
    consola.info(`Selected package manager: ${detected}`);
    return detected;
  }

  const detected = getPkgManager();
  const installed = getInstalledPackageManagers();

  const choices = [
    {
      title: "npm",
      description: "Node.js default package manager",
      value: "npm",
      disabled: !installed.includes("npm"),
    },
    {
      title: "yarn",
      description: "Fast, reliable, and secure dependency management",
      value: "yarn",
      disabled: !installed.includes("yarn"),
    },
    {
      title: "pnpm",
      description: "Fast, disk space efficient package manager",
      value: "pnpm",
      disabled: !installed.includes("pnpm"),
    },
    {
      title: "bun",
      description: "Incredibly fast JavaScript runtime and package manager",
      value: "bun",
      disabled: !installed.includes("bun"),
    },
  ].map((choice) => ({
    ...choice,
    title: choice.disabled
      ? `${choice.title} (not installed)`
      : choice.value === detected
        ? `${choice.title} (current)`
        : choice.title,
  }));

  const { packageManager } = await prompts({
    onState: onPromptState,
    type: "select",
    name: "packageManager",
    message: "Which package manager would you like to use?",
    choices,
    initial: choices.findIndex((choice) => choice.value === detected),
  });

  return packageManager || detected;
}

async function selectPackages(
  availablePackages: PackageAddon[],
  categories: PackageCategory[],
  headless = false,
  verbose = false
): Promise<string[]> {
  if (availablePackages.length === 0) {
    return [];
  }

  if (headless) {
    consola.info("Skipping package selection in headless mode");
    return [];
  }

  // Separate available packages
  const availableReady = availablePackages
    .filter((pkg) => pkg.ready)
    .sort((a, b) => a.title.localeCompare(b.title));

  verboseLog(
    verbose,
    "Available packages:",
    availableReady.map((p) => ({
      title: p.title,
      category: p.category,
      needed: p.needed,
    }))
  );
  verboseLog(
    verbose,
    "Template categories:",
    categories.map((c) => ({ id: c.id, title: c.title }))
  );

  if (availableReady.length === 0) {
    consola.info("No additional packages are available for this template yet.");
    return [];
  }

  // Group packages by category
  const packagesByCategory = new Map<string, PackageAddon[]>();
  availableReady.forEach((pkg) => {
    const categoryId = pkg.category || "extras";
    if (!packagesByCategory.has(categoryId)) {
      packagesByCategory.set(categoryId, []);
    }
    packagesByCategory.get(categoryId)!.push(pkg);
  });

  // Create package map for lookups
  const packageMap = new Map(availableReady.map((pkg) => [pkg.id, pkg]));

  // Function to check if a package's dependencies are met
  const areDependenciesMet = (
    pkg: PackageAddon,
    selectedIds: string[]
  ): boolean => {
    if (!pkg.needed || pkg.needed.length === 0) return true;

    // Get the categories of selected packages
    const selectedCategories = selectedIds
      .map((id) => {
        const selectedPkg = packageMap.get(id);
        return selectedPkg?.category;
      })
      .filter(Boolean);

    // Check if any needed category has been selected
    return pkg.needed.some((neededCategory) =>
      selectedCategories.includes(neededCategory)
    );
  };

  // Function to check if a package conflicts with any selected packages
  const hasConflict = (pkg: PackageAddon, selectedIds: string[]): boolean => {
    return selectedIds.some((selectedId) => {
      const selectedPkg = packageMap.get(selectedId);
      return (
        selectedPkg &&
        (selectedPkg.conflict.includes(pkg.id) ||
          pkg.conflict.includes(selectedId))
      );
    });
  };

  const allSelectedPackages: string[] = [];

  // Create category order based on the provided categories, sorted by their order property
  const sortedCategories = categories
    .slice() // Create a copy to avoid mutating original array
    .sort((a, b) => (a.order || 999) - (b.order || 999))
    .map((cat) => cat.id);

  for (const categoryId of sortedCategories) {
    verboseLog(verbose, `Processing category: ${categoryId}`);
    const category = categories.find((cat) => cat.id === categoryId);
    const categoryPackages = packagesByCategory.get(categoryId) || [];
    verboseLog(
      verbose,
      `Category ${categoryId} has ${categoryPackages.length} packages:`,
      categoryPackages.map((p) => p.title)
    );

    if (categoryPackages.length === 0 || !category) {
      verboseLog(
        verbose,
        `Skipping category ${categoryId} - no packages or category not found`
      );
      continue;
    }

    // Skip authentication if no database package was selected
    if (categoryId === "authentication") {
      const hasDatabasePackage = allSelectedPackages.some((selectedId) => {
        const selectedPkg = packageMap.get(selectedId);
        return selectedPkg?.category === "database";
      });

      if (!hasDatabasePackage) {
        continue;
      }
    }

    // Sort packages in category A-Z
    const sortedCategoryPackages = categoryPackages.sort((a, b) =>
      a.title.localeCompare(b.title)
    );

    // Filter packages based on dependencies and conflicts
    const availableCategoryPackages = sortedCategoryPackages.filter((pkg) => {
      const dependenciesMet = areDependenciesMet(pkg, allSelectedPackages);
      const isConflicted = hasConflict(pkg, allSelectedPackages);
      return dependenciesMet && !isConflicted;
    });

    if (availableCategoryPackages.length === 0) {
      // No packages available in this category
      continue;
    }

    if (categoryId === "extras") {
      const choices = availableCategoryPackages.map((pkg) => ({
        title: pkg.title,
        description: pkg.description,
        value: pkg.id,
        selected: false, // Ensure nothing is pre-selected
      }));

      const { selection } = await prompts({
        onState: onPromptState,
        type: "multiselect",
        name: "selection",
        message: `Which ${category.title.toLowerCase()} packages would you like to add?`,
        choices,
        instructions: false,
        hint: "Space to select, Enter to confirm",
        min: 0, // Allow no selection
      });

      if (selection && selection.length > 0) {
        allSelectedPackages.push(...selection);
      }
    } else {
      // Other categories: single select
      const choices = availableCategoryPackages.map((pkg) => ({
        title: pkg.title,
        description: pkg.description,
        value: pkg.id,
        disabled: false,
      }));

      choices.push({
        title: "⏭️  Skip this category",
        description: `Don't add any ${category.title.toLowerCase()} packages`,
        value: "__SKIP__",
        disabled: false,
      });

      const { selection } = await prompts({
        onState: onPromptState,
        type: "select",
        name: "selection",
        message: `Which ${category.title.toLowerCase()} package would you like to add?`,
        choices,
        initial: 0,
      });

      if (
        selection &&
        selection !== "__SKIP__" &&
        selection !== "__SEPARATOR__"
      ) {
        allSelectedPackages.push(selection);
      }
    }
  }

  if (allSelectedPackages.length > 0) {
    consola.info("Selected packages:");
    allSelectedPackages.forEach((id) => {
      const pkg = packageMap.get(id);
      if (pkg) {
        consola.info(`  • ${pkg.title}`);
      }
    });
  }

  return allSelectedPackages;
}

export function addCommonOptions(command: Command): Command {
  return command
    .option("-h, --headless", "generate without any UI prompts")
    .option(
      "--package-manager <pm>",
      "preferred package manager (npm, yarn, pnpm, bun)"
    )
    .option("--skip-install", "skip installing dependencies")
    .option(
      "-b, --builders <packages...>",
      "specify builder packages to use (e.g., @loafy/builders-nextjs)"
    )
    .option("-v, --verbose", "enable verbose logging for debugging");
}
