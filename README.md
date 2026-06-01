# DOCX Editor - Vue

A pure Vue 3 DOCX editor built with Vite. Edit the core source code directly!

## Quick Start

```bash
npm install
npm run dev
```

The dev server will open at `http://localhost:5173` with hot reload enabled.

## Project Structure

```
packages/
├── core/          # DOCX parsing, serialization, and core logic
│   └── src/
│       ├── docx/           # DOCX format parsing
│       ├── prosemirror/    # ProseMirror integration
│       ├── agent/          # Document agent
│       ├── utils/          # Utilities
│       └── ...
└── vue/           # Vue components and wrappers
    └── src/

src/               # Development environment
├── main.ts        # Vue app entry
├── App.vue        # Root component
└── style.css
```

## Development

- `npm run dev` - Start dev server with hot reload (localhost:5173)
- `npm run build` - Build both packages
- `npm run typecheck` - Type checking

## Edit Source Code

Edit files directly in:
- **`packages/core/src/`** - DOCX processing logic  
- **`packages/vue/src/`** - Vue components

Changes will auto-reload via Vite's hot module replacement!

## License

MIT

```tsx
import { DocxEditor, PluginHost, templatePlugin } from '@eigenpal/docx-js-editor';

<PluginHost plugins={[templatePlugin]}>
  <DocxEditor documentBuffer={file} />
</PluginHost>;
```

See the [plugin documentation](https://www.docx-editor.dev/docs/plugins) for the full plugin API.

## Development

```bash
bun install
bun run dev        # localhost:5173
bun run build
bun run typecheck
```

A live preview of `main` is auto-deployed at **[latest.docx-editor.dev](https://latest.docx-editor.dev/)** — useful for trying out changes before they ship to npm.

Examples: [Vite](examples/vite) | [Next.js](examples/nextjs) | [Remix](examples/remix) | [Astro](examples/astro) | [Vue](examples/vue)

**[Documentation](https://www.docx-editor.dev/docs)** | **[Props & Ref Methods](https://www.docx-editor.dev/docs/props)** | **[Plugins](https://www.docx-editor.dev/docs/plugins)** | **[Architecture](https://www.docx-editor.dev/docs/architecture)**

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, tests, and the one-time CLA signature.

## Translations

| Locale  | Language            | Coverage |
| ------- | ------------------- | -------- |
| `en`    | English             | 100%     |
| `de`    | German              | 100%     |
| `pl`    | Polish              | 100%     |
| `pt-BR` | Portuguese (Brazil) | 100%     |

Help translate the editor into your language! See the full **[i18n contribution guide](docs/i18n.md)**.

```bash
bun run i18n:new de      # scaffold German locale
bun run i18n:status      # check translation coverage
```

## Commercial Support

> [!TIP]
> Questions or custom features? Email **[docx-editor@eigenpal.com](mailto:docx-editor@eigenpal.com)**.
