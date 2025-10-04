# Package Addon Template

This is a template scaffold for creating package add-ons in Loafy CLI.

## Instructions

1. **Copy this folder**: Create a new folder in `builders/packages/` with your package name
2. **Update config.json**:
   - Change `id` to match the base framework + package name (e.g., "nextjs-auth")
   - Set `appUuid` to match the base template's UUID
   - Update `title` and `description`
   - Set appropriate `category`: `database`, `authentication`, `linting-formatting`, or `extras`
   - Configure `conflict` array with conflicting package IDs
   - Configure `needed` array with required categories (e.g., ["database"] for auth)
   - Set `baseTemplate` to the framework this package works with
   - Set `ready: true` when complete
3. **Update package.json**:
   - Change the `name` to `@loafy/framework-package-name`
   - Update description and keywords
4. **Add template files**:
   - Add configuration files, source code, etc. to `templates/js/` and `templates/ts/`
   - Use `_package.json` to define dependencies that will be merged into the main project
   - Add any framework-specific integration files

## Categories
- `database`: Database connections, ORMs (Drizzle, Prisma, etc.)
- `authentication`: Auth libraries (NextAuth, Better Auth, etc.)
- `linting-formatting`: Code quality tools (ESLint, Prettier, etc.)
- `extras`: Other utilities and integrations

## Dependencies
- `conflict`: Array of package IDs that cannot be used with this package
- `needed`: Array of category names that must be selected before this package appears
- `baseTemplate`: The framework this package is designed for

## Example Structure
```
nextjs-auth/
├── config.json          # Package configuration  
├── package.json          # Package metadata
└── templates/
    ├── js/              # JavaScript variant
    │   ├── _package.json # Dependencies to merge
    │   ├── config.js    # Package files
    │   └── ...
    └── ts/              # TypeScript variant
        ├── _package.json # Dependencies to merge  
        ├── config.ts    # Package files
        └── ...
```