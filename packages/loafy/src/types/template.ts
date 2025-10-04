export interface TemplateConfig {
  id: string;
  title: string;
  description: string;
  category?: string;
  categoryUuid?: string;
  ready: boolean;
  conflict: string[];
  needed: string[];
  baseTemplate?: string;
  baseTemplateUuid?: string;
}

export interface PackageCategory {
  id: string;
  uuid: string;
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
  categoryUuid: string;
  ready: boolean;
  conflict: string[];
  needed: string[];
  path: string;
  baseTemplate: string;
  baseTemplateUuid: string;
}

export type Language = "js" | "ts";

export interface ProjectConfig {
  name: string;
  baseTemplate: string;
  language: Language;
  packages: string[];
  packageManager: string;
  version?: string;
  owner?: string;
}
