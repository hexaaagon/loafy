# Category Template

This is a template scaffold for creating category definitions in Loafy CLI.

## Instructions

1. **Copy this folder**: Create a new folder in `builders/categories/` with your category set name
2. **Update config.json**:
   - Change `id` to your category set identifier (e.g., "web", "mobile", "desktop")
   - Update `title` and `description`
   - List the `frameworks` this category set applies to
3. **Update package.json**:
   - Change the `name` to `@loafy/categories-name`
   - Update description
4. **Add category files**:
   - Create JSON files in `categories/` folder for each framework
   - Each file should be named `{framework}.json` (e.g., `nextjs.json`, `react.json`)
   - Define categories with proper order for display priority

## Category Structure
Each category JSON file should contain an array of category objects:

```json
[
  {
    "id": "category-id",           // Unique identifier
    "title": "Display Name",       // User-friendly name
    "description": "Description",  // What this category includes
    "order": 1                     // Display order (lower = earlier)
  }
]
```

## Common Categories
- `linting-formatting`: ESLint, Prettier, etc.
- `database`: Drizzle, Prisma, databases
- `authentication`: Auth libraries
- `state-management`: Redux, Zustand, etc.
- `ui-components`: Component libraries
- `testing`: Jest, Vitest, etc.
- `deployment`: Vercel, Docker, etc.
- `extras`: Miscellaneous utilities

## Notes
- Categories with lower `order` values appear first
- `extras` should typically have a high order value (999)
- Categories determine when packages appear based on dependencies
- Each framework can have its own category definitions