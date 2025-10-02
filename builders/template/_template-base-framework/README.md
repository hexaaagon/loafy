# Template Framework

This is a template scaffold for creating new framework templates in Loafy CLI.

## Instructions

1. **Copy this folder**: Create a new folder in `builders/template/` with your framework name
2. **Update config.json**: 
   - Change `id` to your framework identifier
   - Generate a new UUID for `uuid` field
   - Update `title` and `description`
   - Set `ready: true` when the template is complete
3. **Update package.json**:
   - Change the `name` to `@loafy/your-framework-name`
   - Update description and keywords
4. **Add template files**:
   - Add your framework files to `templates/js/` and `templates/ts/`
   - Use `{{config.projectName}}` placeholder for project name replacement
   - Add all necessary configuration files, dependencies, etc.

## Example Structure
```
your-framework/
├── config.json          # Framework configuration
├── package.json          # Package metadata
└── templates/
    ├── js/              # JavaScript variant
    │   ├── package.json
    │   └── ...          # Framework files
    └── ts/              # TypeScript variant
        ├── package.json
        ├── tsconfig.json
        └── ...          # Framework files
```

## Notes
- The `{{config.projectName}}` placeholder will be replaced with the actual project name
- Both JS and TS variants should be provided
- Add proper dependencies for your framework in the respective package.json files