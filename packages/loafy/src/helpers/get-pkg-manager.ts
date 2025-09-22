import { execSync } from "child_process";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export function getPkgManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent || "";

  if (userAgent.startsWith("yarn")) {
    return "yarn";
  }

  if (userAgent.startsWith("pnpm")) {
    return "pnpm";
  }

  if (userAgent.startsWith("bun")) {
    return "bun";
  }

  return "npm";
}

export function getInstalledPackageManagers(): PackageManager[] {
  const managers: PackageManager[] = [];

  // npm is always available if Node.js is installed
  managers.push("npm");

  const checkCommands: Array<{ manager: PackageManager; command: string }> = [
    { manager: "yarn", command: "yarn --version" },
    { manager: "pnpm", command: "pnpm --version" },
    { manager: "bun", command: "bun --version" },
  ];

  for (const { manager, command } of checkCommands) {
    try {
      execSync(command, { stdio: "ignore" });
      managers.push(manager);
    } catch {
      // Package manager not installed
    }
  }

  return managers;
}
