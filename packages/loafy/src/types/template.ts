export interface TemplateConfig {
  id: string;
  title: string;
  description: string;
  category?: string;
  ready: boolean;
  conflict: string[];
  needed: string[];
  version: string;
}

export interface PackageCategory {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface BaseTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  ready: boolean;
  path: string;
}

export interface PackageAddon {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  ready: boolean;
  conflict: string[];
  needed: string[];
  version: string;
  path: string;
  baseTemplate: string;
}

export type Language = "js" | "ts";

export interface ProjectConfig {
  name: string;
  baseTemplate: string;
  language: Language;
  packages: string[];
  packageManager: string;
}
