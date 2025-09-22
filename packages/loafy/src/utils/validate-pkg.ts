export interface ValidationResult {
  valid: boolean;
  problems?: string[];
}

export function validateNpmName(name: string): ValidationResult {
  const problems: string[] = [];

  if (name.length === 0) {
    problems.push("name length must be greater than zero");
  }

  if (name.match(/^\./)) {
    problems.push("name cannot start with a period");
  }

  if (name.match(/^_/)) {
    problems.push("name cannot start with an underscore");
  }

  if (name.trim() !== name) {
    problems.push("name cannot contain leading or trailing spaces");
  }

  // Check for invalid characters
  if (name.match(/[~)('!*]/)) {
    problems.push("name can only contain URL-friendly characters");
  }

  if (name.toLowerCase() !== name) {
    problems.push("name can no longer contain capital letters");
  }

  if (name.length > 214) {
    problems.push("name can no longer contain more than 214 characters");
  }

  // Check for reserved names
  const reservedNames = [
    "node_modules",
    "favicon.ico",
    ".git",
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
  ];

  if (reservedNames.includes(name.toLowerCase())) {
    problems.push(`name cannot be "${name}" as it is a reserved name`);
  }

  return {
    valid: problems.length === 0,
    problems: problems.length > 0 ? problems : undefined,
  };
}
