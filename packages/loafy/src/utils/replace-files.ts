/**
 * File replacement mappings for template processing
 * Each sub-array contains [sourceFilename, targetFilename]
 * Used to rename files during template copying (e.g., gitignore -> .gitignore)
 */
export const replaceFile: [string, string][] = [["gitignore", ".gitignore"]];
