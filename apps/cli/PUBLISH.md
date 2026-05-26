# Publishing `@aisounds/cli` to npm

The package is configured for public publish (`publishConfig.access: public`).

## Prerequisites

1. Log in to npm with an account that can publish the `@aisounds` scope:

   ```bash
   npm login
   npm whoami
   ```

2. From the monorepo root, run tests and build:

   ```bash
   pnpm --filter @aisounds/cli test
   pnpm --filter @aisounds/cli build
   ```

## Publish

```bash
cd apps/cli
npm publish
```

`prepublishOnly` runs `npm run build` automatically.

## Verify

```bash
npm view @aisounds/cli version
npx @aisounds/cli@latest --version
npx @aisounds/cli@latest info universfield
```
