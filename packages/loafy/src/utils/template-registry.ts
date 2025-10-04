import type { BaseTemplate } from "../types/template.js";

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
  {
    id: "a674a07f-c6f4-4c72-a848-c9c690b1154c",
    name: "turborepo",
    title: "Turborepo Monorepo",
    description: "Monorepo setup using Turborepo",
    ready: false,
  },
];

/**
 * Get builder package names for a template
 *
 * NOTE: Template and categories versions are automatically updated by CI/CD workflows when builders are published.
 * Package addon versions are fetched dynamically from npm registry.
 */
export function getBuilderPackages(templateName: string): {
  template: string;
  categories: string;
  packageAddons: string[];
  templateVersion: string;
} {
  const builderMap: Record<
    string,
    {
      template: string;
      categories: string;
      packageAddons: string[];
      templateVersion: string;
    }
  > = {
    nextjs: {
      template: "@loafy/builders-nextjs",
      categories: "@loafy/categories-web",
      packageAddons: [
        "@loafy/packages-nextjs-biome",
        "@loafy/packages-nextjs-eslint",
        "@loafy/packages-nextjs-prettier-tailwind",
      ],
      templateVersion: "^0.2.0", // AUTO-UPDATED by workflow
    },
    expo: {
      template: "@loafy/builders-expo",
      categories: "@loafy/categories-mobile",
      packageAddons: [],
      templateVersion: "^0.1.0", // AUTO-UPDATED by workflow
    },
    turborepo: {
      template: "@loafy/builders-turborepo",
      categories: "@loafy/categories-monorepo",
      packageAddons: [],
      templateVersion: "^0.1.0", // AUTO-UPDATED by workflow
    },
  };

  return (
    builderMap[templateName] || {
      template: `@loafy/builders-${templateName}`,
      categories: "@loafy/categories-web",
      packageAddons: [],
      templateVersion: "latest",
    }
  );
}
