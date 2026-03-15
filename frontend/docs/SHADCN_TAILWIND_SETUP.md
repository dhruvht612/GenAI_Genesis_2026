# shadcn, Tailwind & TypeScript Setup Notes

## Current State (After Integration)

- **Tailwind CSS**: Installed and configured via `@tailwindcss/postcss`. Entry: `@import "tailwindcss";` in `src/index.css`.
- **TypeScript**: `tsconfig.json` and `tsconfig.node.json` present. New UI components can use `.tsx`.
- **Path alias**: `@/*` → `./src/*` in `tsconfig.json` and in `vite.config.js` via `resolve.alias`.
- **Component location**: `src/components/ui/` is the default path for shared UI components (e.g. `gradient-background.tsx`, `sign-in-card-2.tsx`, `sign-up-card.tsx`).
- **Utils**: `src/lib/utils.ts` exports `cn()` (clsx + tailwind-merge) for class names.

## Why `src/components/ui`?

Keeping UI primitives and design-system components under `components/ui`:

- Matches common React/shadcn structure so copy-pasted components “just work”.
- Keeps layout/page components separate from reusable UI building blocks.
- Makes it clear where to add future shadcn-style components.

## Adding More shadcn-Style Components

1. Put new components in `src/components/ui/` (e.g. `button.tsx`, `card.tsx`).
2. Use `cn()` from `@/lib/utils` for class names.
3. Use TypeScript (`.tsx`) and Tailwind classes; import in JS/TS with `@/components/ui/...`.

## Full shadcn CLI (Optional)

To turn this into a full shadcn-ui project later:

```bash
npx shadcn@latest init
```

During init, choose:

- Style: Default or New York
- Base color: e.g. Slate
- CSS variables: Yes
- Tailwind config: use existing
- Components path: `src/components/ui`
- Utils path: `src/lib/utils`
- React Server Components: No (Vite is client-only)
- Path alias: `@/*`

Then add components with:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

## Installed Dependencies

- **framer-motion** – animations (used by `GradientBackground`, sign-in/sign-up cards)
- **lucide-react** – icons (Mail, Lock, Eye, etc. in auth cards)
- **clsx** + **tailwind-merge** – `cn()` in `src/lib/utils.ts`
- **tailwindcss** + **@tailwindcss/postcss** + **autoprefixer** – Tailwind pipeline
- **typescript** – for `.ts`/`.tsx` and path alias
