import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const coreRoot = path.resolve(__dirname, './packages/core/src')
const pmRoot = path.resolve(__dirname, './packages/core/node_modules')

// Subpath map: most-specific first so the resolver short-circuits correctly.
const coreSubpaths: Record<string, string> = {
  '@eigenpal/docx-core/prosemirror/conversion': `${coreRoot}/prosemirror/conversion/index.ts`,
  '@eigenpal/docx-core/prosemirror/extensions': `${coreRoot}/prosemirror/extensions/index.ts`,
  '@eigenpal/docx-core/prosemirror/commands':   `${coreRoot}/prosemirror/commands/index.ts`,
  '@eigenpal/docx-core/prosemirror/plugins':    `${coreRoot}/prosemirror/plugins/index.ts`,
  '@eigenpal/docx-core/prosemirror':            `${coreRoot}/prosemirror/index.ts`,
  '@eigenpal/docx-core/docx/serializer':        `${coreRoot}/docx/serializer/index.ts`,
  '@eigenpal/docx-core/docx':                   `${coreRoot}/docx/index.ts`,
  '@eigenpal/docx-core/layout-engine':          `${coreRoot}/layout-engine/index.ts`,
  '@eigenpal/docx-core/layout-painter':         `${coreRoot}/layout-painter/index.ts`,
  '@eigenpal/docx-core/layout-bridge':          `${coreRoot}/layout-bridge/index.ts`,
  '@eigenpal/docx-core/agent':                  `${coreRoot}/agent/index.ts`,
  '@eigenpal/docx-core/utils':                  `${coreRoot}/utils/index.ts`,
  '@eigenpal/docx-core/types/document':         `${coreRoot}/types/document.ts`,
  '@eigenpal/docx-core/types/content':          `${coreRoot}/types/content.ts`,
  '@eigenpal/docx-core/types/agentApi':         `${coreRoot}/types/agentApi.ts`,
  '@eigenpal/docx-core/core-plugins':           `${coreRoot}/core-plugins/index.ts`,
  '@eigenpal/docx-core/plugin-api':             `${coreRoot}/plugin-api/index.ts`,
  '@eigenpal/docx-core':                        `${coreRoot}/core.ts`,
}

export default defineConfig({
  plugins: [
    vue(),
    {
      // Custom resolver: handles @eigenpal/docx-core subpaths and prosemirror
      // peer deps that live in packages/core/node_modules.
      name: 'docx-core-resolver',
      resolveId(id) {
        // Exact subpath match (most-specific wins because we iterate in order)
        if (id in coreSubpaths) return coreSubpaths[id]

        // Prosemirror peer deps live in core's node_modules
        if (id.startsWith('prosemirror-')) {
          return { id: path.resolve(pmRoot, id), external: false }
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
