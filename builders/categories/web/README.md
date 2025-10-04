> **See [GitHub](https://github.com/hexaaagon/loafy) for more info, documentation, and updates.**

<div align="middle">
  <picture>
    <img src="https://raw.githubusercontent.com/hexaaagon/loafy/refs/heads/main/.github/assets/loafy.png" alt="Loafy Logo" height="128" width="128" />
  </picture>
</div>

<h1 align="center">Loafy - Web Category</h1>

> If you landed here by mistake, this is not the main Loafy package. For the core Loafy tool, please visit [Loafy on npm](https://npmjs.com/package/loafy).

## What is Category in Loafy?

A **Category** in Loafy is used by the Loafy CLI to determine which setup questions to ask and which builder addons to include during project initialization. Categories help organize the setup process by grouping related questions and topics, making it easier to tailor the project configuration to your needs.

## Why is this Split from the Main Package?

Package add-ons are published separately from the main `loafy` npm package to keep the bundle size minimal. This modular approach ensures you only install what you need. For example, if you only want to set up Next.js, you won’t get unnecessary dependencies like Expo or Turborepo, which would otherwise triple the bundle size.

This separation helps optimize resource usage, making your project setup lean and efficient.