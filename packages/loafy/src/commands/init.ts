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

export async function initProject(options: {
  packageManager?: PackageManager;
  headless?: boolean;
  skipInstall?: boolean;
  projectName?: string;
}) {
  try {
    const { baseTemplates, packageAddons, categories } =
      await discoverTemplates();

    if (baseTemplates.length === 0) {
      consola.error("No base templates found!");
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

    const appPath = resolve(projectPath);
    const appName = basename(appPath);

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

    // Select base template
    const selectedTemplate = await selectBaseTemplate(
      baseTemplates,
      options.headless
    );
    if (!selectedTemplate) {
      consola.error("No template selected");
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
      options.headless
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
    initial: installed.findIndex((pm) => pm === detected),
  });

  return packageManager || detected;
}

async function selectPackages(
  availablePackages: PackageAddon[],
  categories: PackageCategory[],
  headless = false
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
    return pkg.needed.some((neededId) => selectedIds.includes(neededId));
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

  // Define the specific order of categories
  const categoryOrder = ["database", "authentication", "backend", "extras"];

  for (const categoryId of categoryOrder) {
    const category = categories.find((cat) => cat.id === categoryId);
    const categoryPackages = packagesByCategory.get(categoryId) || [];

    if (categoryPackages.length === 0 || !category) continue;

    // Skip authentication if no database package was selected
    if (categoryId === "authentication" && allSelectedPackages.length === 0) {
      continue;
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
      // Extras category: multiselect
      const choices = availableCategoryPackages.map((pkg) => ({
        title: pkg.title,
        description: pkg.description,
        value: pkg.id,
        disabled: false,
      }));

      choices.push({
        title: " ",
        description: "",
        value: "__SEPARATOR__",
        disabled: true,
      });

      choices.push({
        title: "⏭️  Skip this category",
        description: `Don't add any ${category.title.toLowerCase()} packages`,
        value: "__SKIP__",
        disabled: false,
      });

      const { selection } = await prompts({
        onState: onPromptState,
        type: "multiselect",
        name: "selection",
        message: `Which ${category.title.toLowerCase()} packages would you like to add?`,
        choices,
        instructions: false,
        hint: "Space to select, Enter to confirm",
      });

      if (selection && selection.length > 0) {
        const validSelections = selection.filter(
          (id: string) => id !== "__SKIP__" && id !== "__SEPARATOR__"
        );
        allSelectedPackages.push(...validSelections);
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
        title: " ",
        description: "",
        value: "__SEPARATOR__",
        disabled: true,
      });

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
    .option("--skip-install", "skip installing dependencies");
}
