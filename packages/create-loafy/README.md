# create-loafy

The easiest way to get started with Loafy is by using `create-loafy`. This CLI tool enables you to quickly start building a new Loafy application, with everything set up for you.

## Quick Start

To get started, use the following command:

```bash
npx create-loafy my-app
cd my-app
```

Or with a specific package manager:

```bash
npx create-loafy my-app --use-pnpm
npx create-loafy my-app --package-manager yarn
```

## Options

`create-loafy` accepts the same options as `loafy init`:

- `--use-npm` - Use npm as package manager
- `--use-yarn` - Use Yarn as package manager  
- `--use-pnpm` - Use pnpm as package manager
- `--use-bun` - Use Bun as package manager
- `--package-manager <pm>` - Specify package manager (npm, yarn, pnpm, bun)
- `--skip-install` - Skip installing dependencies
- `--headless` - Generate without any UI prompts

## Interactive Mode

Running `npx create-loafy` without arguments will start the interactive mode where you can:

1. Choose your project name
2. Select a template (Next.js App, Expo App, etc.)
3. Choose language (TypeScript or JavaScript)
4. Add additional packages (Supabase, Drizzle ORM, Better Auth, etc.)
5. Select your preferred package manager

## What's Included

Loafy includes templates and packages for:

- **Next.js App Router** - Modern React framework
- **Expo** - React Native for mobile apps
- **Supabase** - Backend as a Service
- **Drizzle ORM** - Type-safe database ORM
- **Better Auth** - Authentication solution
- And more...

## Learn More

- [Loafy Documentation](https://github.com/hexaaagon/loafy)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)