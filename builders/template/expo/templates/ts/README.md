> **See [GitHub](https://github.com/hexaaagon/loafy) for more info, documentation, and updates.**

<div align="middle">
  <picture>
    <img src="https://raw.githubusercontent.com/hexaaagon/loafy/refs/heads/main/.github/assets/loafy.png" alt="Loafy Logo" height="128" width="128" />
  </picture>
</div>

<h1 align="center">Loafy - Expo Builder</h1>

> If you landed here by mistake, this is not the main Loafy package. For the core Loafy tool, please visit [Loafy on npm](https://npmjs.com/package/loafy).

## What is a Builder?

A **builder** in Loafy is a complete template containing the code and configuration for a specific framework, such as Next.js, Turborepo, or Expo. Builders provide ready-to-use project structures, helping you quickly scaffold applications with best practices and recommended setups for each framework.

## Why is this Split from the Main Package?

Package add-ons are published separately from the main `loafy` npm package to keep the bundle size minimal. This modular approach ensures you only install what you need. For example, if you only want to set up Next.js, you won’t get unnecessary dependencies like Expo or Turborepo, which would otherwise triple the bundle size.

This separation helps optimize resource usage, making your project setup lean and efficient.