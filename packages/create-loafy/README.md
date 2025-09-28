> [!WARNING]
**Loafy is currently in beta.** This project has only been under development for 5 days, so you may experience rapid changes and potential instability.

<div align="middle">
  <picture>
    <img src="https://raw.githubusercontent.com/hexaaagon/loafy/refs/heads/main/.github/assets/loafy.png" alt="Loafy Logo" height="128" width="128" />
  </picture>
</div>

<h1 align="center">Loafy</h1>

<p align="center">Loafy is a command-line tool designed to help you build full-stack apps—such as those using Next.js (more framework coming soon!). It generates a boilerplate template tailored to your preferred packages and architecture, following best practices.</p>

## Features

- **🚀 Modern Full-Stack Templates**: Get started with production-ready Next.js and other frameworks
- **📦 Modular Package System**: Choose from a curated collection of popular packages and integrations
- **🎯 Interactive CLI**: User-friendly command-line interface with smart prompts and validation
- **⚡ Multiple Package Managers**: Support for npm, pnpm, yarn, and bun
- **🎨 Best Practices**: Generated projects follow industry standards and best practices
- **🔒 Type-Safe**: Full TypeScript support with proper type definitions

### Integrations

**Linting & Formatting**
- [x] ESLint with recommended configurations
- [x] Biome for ultra-fast linting and formatting
- [x] Prettier with Tailwind CSS plugin

**Authentication**
- [ ] Better Auth for modern authentication
- [ ] Supabase Auth integration

**Database & ORM**
- [ ] Drizzle ORM with PostgreSQL
- [ ] Drizzle ORM with Supabase
- [ ] Supabase database integration

**Frameworks**
- [x] Next.js App Router with TypeScript/~~JavaScript~~ support
- [ ] Expo for React Native development
- More frameworks coming soon!

## Quick Start

### Using npx (Recommended)

```bash
npx create-loafy@latest my-app
```

### Using global installation

1. **Install Loafy globally**:
   ```bash
   npm install -g loafy
   # or
   pnpm add -g loafy
   # or  
   yarn global add loafy
   # or
   bun add -g loafy
   ```

2. **Create a new project**:
   ```bash
   loafy init my-app
   ```

3. **Navigate to your project**:
   ```bash
   cd my-app
   ```

4. **Start developing**:
   ```bash
   npm run dev
   # or
   pnpm dev
   # or
   yarn dev
   # or
   bun dev
   ```

## Contributing

Keen on enhancing Loafy? Contributions, bug reports, and feature requests are always welcome. Feel free to open an issue or submit a pull request.

## Special Thanks to

<div>
  <a href="https://siege.hackclub.com/?ref=432">
    <img src="https://siege.hackclub.com/assets/logo-55998110.webp" alt="Hack Club Logo" height="48"></img>
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://hackclub.com">
    <img src="https://assets.hackclub.com/flag-standalone.svg" alt="Hack Club Logo" height="48"></img>
  </a>
</div>