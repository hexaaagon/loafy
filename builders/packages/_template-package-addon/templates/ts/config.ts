// Example TypeScript configuration file for the package
// This file will be copied to the project root or appropriate location

export interface PackageConfig {
  enabled: boolean;
  options: {
    // Define your package-specific options here
  };
}

export const packageConfig: PackageConfig = {
  enabled: true,
  options: {
    // Package-specific options
  },
};
