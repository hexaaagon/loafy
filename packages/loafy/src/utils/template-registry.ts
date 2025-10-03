import type { BaseTemplate } from "../types/template.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the current loafy package version
 */
function getLoafyVersion(): string {
  try {
    const packageJsonPath = join(__dirname, "../../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version;
  } catch {
    return "latest";
  }
}

/**
 * Determine which builder version to use based on loafy version
 */
function getBuilderVersion(): string {
  const loafyVersion = getLoafyVersion();

  // If loafy is a canary version, use canary builders
  if (loafyVersion.includes("-canary.")) {
    return "canary";
  }

  // For stable versions, use semver range matching the loafy version
  // This ensures old loafy versions use compatible old builder versions
  const match = loafyVersion.match(/^(\d+\.\d+)/);
  if (match) {
    return `^${match[1]}.0`;
  }

  return "latest";
}

/**
 * Hardcoded list of available templates
 * This allows us to show templates even before builders are installed
 */
export const AVAILABLE_TEMPLATES: Omit<BaseTemplate, "path">[] = [
  {
    id: "8f3a9b2e-5d1c-4e7f-9a0b-3c6d8e2f1a4b",
    name: "nextjs",
    title: "Next.js",
    description: "Full-stack React framework with server-side rendering",
    ready: true,
  },
  {
    id: "7e2b4f8a-3c9d-4b1e-8f5a-2d6c9e1b3a7f",
    name: "expo",
    title: "Expo",
    description: "React Native framework for mobile applications",
    ready: false,
  },
];

/**
 * Get builder package names for a template
 */
export function getBuilderPackages(templateName: string): {
  template: string;
  categories: string;
  version: string;
} {
  const version = getBuilderVersion();

  const builderMap: Record<
    string,
    { template: string; categories: string; version: string }
  > = {
    nextjs: {
      template: "@loafy/builders-nextjs",
      categories: "@loafy/categories-web",
      version,
    },
    expo: {
      template: "@loafy/builders-expo",
      categories: "@loafy/categories-mobile",
      version,
    },
  };

  return (
    builderMap[templateName] || {
      template: `@loafy/builders-${templateName}`,
      categories: "@loafy/categories-web",
      version,
    }
  );
}
