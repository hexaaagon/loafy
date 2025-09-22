import { readdirSync, statSync } from "fs";
import { join } from "path";
import { consola } from "consola";

export function isFolderEmpty(folderPath: string, folderName: string): boolean {
  try {
    const files = readdirSync(folderPath);

    if (files.length === 0) {
      return true;
    }

    // Filter out common hidden files that are acceptable
    const validFiles = files.filter((file) => {
      // Allow common hidden files
      if ([".git", ".gitignore", ".DS_Store", "Thumbs.db"].includes(file)) {
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return true;
    }

    consola.error(
      `The directory ${folderName} contains files that could conflict:`
    );

    validFiles.forEach((file) => {
      const filePath = join(folderPath, file);
      const isDirectory = statSync(filePath).isDirectory();
      consola.error(`  ${file}${isDirectory ? "/" : ""}`);
    });

    consola.error(
      "\nEither try using a new directory name, or remove the files listed above."
    );

    return false;
  } catch (error) {
    // If we can't read the directory, assume it's empty
    return true;
  }
}
