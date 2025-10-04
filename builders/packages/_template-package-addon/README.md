> **See [GitHub](https://github.com/hexaaagon/loafy) for more info, documentation, and updates.**

<div align="middle">
  <picture>
    <img src="https://raw.githubusercontent.com/hexaaagon/loafy/refs/heads/main/.github/assets/loafy.png" alt="Loafy Logo" height="128" width="128" />
  </picture>
</div>

<h1 align="center">Loafy - Lorem Ipsum Package Add-On</h1>

> If you landed here by mistake, this is not the main Loafy package. For the core Loafy tool, please visit [Loafy on npm](https://npmjs.com/package/loafy).

## What is a Package Add-On?

A **package add-on** in Loafy is a dependency that can be used as a service in your project templates, such as `better-auth`, `drizzle-orm`, and more. Add-ons extend Loafy’s capabilities by integrating popular libraries and services into your project setup.

## Why is this Split from the Main Package?

Package add-ons are published separately from the main `loafy` npm package to keep the bundle size minimal. This modular approach ensures you only install what you need. For example, if you only want to set up Next.js, you won’t get unnecessary dependencies like Expo or Turborepo, which would otherwise triple the bundle size.

This separation helps optimize resource usage, making your project setup lean and efficient.