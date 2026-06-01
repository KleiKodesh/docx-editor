<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { parseDocx, getFootnoteText } from '@eigenpal/docx-core/docx'
import { toProseDoc } from '@eigenpal/docx-core/prosemirror/conversion'
import {
  toFlowBlocks,
  measureParagraph,
  collectFootnoteRefs,
  mapFootnotesToPages,
} from '@eigenpal/docx-core/layout-bridge'
import { layoutDocument } from '@eigenpal/docx-core/layout-engine'
import { renderPages } from '@eigenpal/docx-core/layout-painter'
import type {
  FlowBlock,
  Measure,
  ParagraphBlock,
  TableBlock,
  ImageBlock,
  TextBoxBlock,
} from '@eigenpal/docx-core/layout-engine'
import type { BlockLookup, FootnoteRenderItem } from '@eigenpal/docx-core/layout-painter'
import type { Document } from '@eigenpal/docx-core/types/document'

const props = defineProps<{ src: string }>()

const container = ref<HTMLElement | null>(null)
const status = ref<'loading' | 'error' | 'ready'>('loading')
const errorMessage = ref('')

function twipsToPixels(twips: number): number {
  return (twips / 1440) * 96
}

function buildMeasures(blocks: FlowBlock[], contentWidth: number): Measure[] {
  return blocks.map((block): Measure => {
    switch (block.kind) {
      case 'paragraph':
        return measureParagraph(block as ParagraphBlock, contentWidth)

      case 'image': {
        const img = block as ImageBlock
        return { kind: 'image', width: img.width, height: img.height }
      }

      case 'table': {
        const tbl = block as TableBlock
        const colCount = Math.max(tbl.rows[0]?.cells.length ?? 1, 1)
        const colWidth = contentWidth / colCount
        const rows = tbl.rows.map((row) => {
          const cells = row.cells.map((cell) => {
            const cellMeasures = buildMeasures(cell.blocks ?? [], colWidth)
            const cellHeight = cellMeasures.reduce((sum, m) => {
              if (m.kind === 'paragraph') return sum + m.totalHeight
              if (m.kind === 'image') return sum + m.height
              if (m.kind === 'table') return sum + m.totalHeight
              return sum
            }, 0)
            return { blocks: cellMeasures, width: colWidth, height: Math.max(cellHeight, 20) }
          })
          return { cells, height: Math.max(...cells.map((c) => c.height), 20) }
        })
        return {
          kind: 'table',
          rows,
          columnWidths: Array<number>(colCount).fill(colWidth),
          totalWidth: contentWidth,
          totalHeight: rows.reduce((s, r) => s + r.height, 0),
        }
      }

      case 'textBox': {
        const tb = block as TextBoxBlock
        const tbWidth = tb.width ?? 200
        const innerMeasures = tb.content.map((b) => measureParagraph(b, tbWidth))
        const tbHeight = tb.height ?? innerMeasures.reduce((s, m) => s + m.totalHeight, 40)
        return { kind: 'textBox', width: tbWidth, height: tbHeight, innerMeasures }
      }

      case 'pageBreak':    return { kind: 'pageBreak' }
      case 'columnBreak':  return { kind: 'columnBreak' }
      case 'sectionBreak': return { kind: 'sectionBreak' }

      default:
        return { kind: 'paragraph', lines: [], totalHeight: 0 }
    }
  })
}

async function load() {
  status.value = 'loading'
  errorMessage.value = ''

  try {
    const response = await fetch(props.src)
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${props.src}`)
    const buffer = await response.arrayBuffer()

    const doc: Document = await parseDocx(buffer, {
      preloadFonts: true,
      parseHeadersFooters: false,
      parseNotes: true,       // need footnotes
      detectVariables: false,
    })

    const styles = doc.package.styles
    const pmDoc = toProseDoc(doc, { styles })

    // Page geometry from final section properties
    const sectPr     = doc.package.document.finalSectionProperties
    const pageW      = sectPr?.pageWidth    ? Math.round(twipsToPixels(sectPr.pageWidth))    : 816
    const pageH      = sectPr?.pageHeight   ? Math.round(twipsToPixels(sectPr.pageHeight))   : 1056
    const marginTop  = sectPr?.marginTop    ? Math.round(twipsToPixels(sectPr.marginTop))    : 96
    const marginBot  = sectPr?.marginBottom ? Math.round(twipsToPixels(sectPr.marginBottom)) : 96
    const marginLeft = sectPr?.marginLeft   ? Math.round(twipsToPixels(sectPr.marginLeft))   : 96
    const marginRight= sectPr?.marginRight  ? Math.round(twipsToPixels(sectPr.marginRight))  : 96
    const contentWidth = pageW - marginLeft - marginRight

    const layoutOptions = {
      pageSize: { w: pageW, h: pageH },
      margins: { top: marginTop, bottom: marginBot, left: marginLeft, right: marginRight },
    }

    // Default font/size from document defaults
    const rPr = styles?.docDefaults?.rPr
    const defaultFont = rPr?.fontFamily?.ascii ?? rPr?.fontFamily?.hAnsi ?? 'Calibri'
    const defaultSize = rPr?.fontSize ? rPr.fontSize / 2 : 11  // half-points → points

    const blocks = toFlowBlocks(pmDoc, {
      theme: doc.package.theme ?? null,
      defaultFont,
      defaultSize,
      pageContentHeight: pageH - marginTop - marginBot,
    })

    const measures = buildMeasures(blocks, contentWidth)

    // ── FOOTNOTE PIPELINE ──────────────────────────────────────────────────
    // Strategy: build the exact same DOM structure renderFootnoteArea uses,
    // measure its real offsetHeight in the browser, then use that for the
    // layout reservation. This avoids any font/language estimation error.

    function measureFootnoteAreaHeight(
      items: FootnoteRenderItem[],
      width: number
    ): number {
      const probe = document.createElement('div')
      probe.style.cssText = `position:absolute;visibility:hidden;top:-9999px;left:-9999px;width:${width}px`

      // Separator
      const sep = document.createElement('div')
      sep.style.cssText = 'width:33%;height:0.5px;margin-top:6px;margin-bottom:6px'
      probe.appendChild(sep)

      for (const fn of items) {
        const row = document.createElement('div')
        row.style.cssText = 'font-size:10px;line-height:1.3;margin-bottom:4px'
        const sup = document.createElement('sup')
        sup.style.cssText = 'font-size:7px;margin-right:2px'
        sup.textContent = fn.displayNumber
        row.appendChild(sup)
        row.appendChild(document.createTextNode(' ' + fn.text))
        probe.appendChild(row)
      }

      document.body.appendChild(probe)
      const h = probe.offsetHeight
      document.body.removeChild(probe)
      return h
    }

    const footnotes = doc.package.footnotes ?? []
    let footnotesByPage: Map<number, FootnoteRenderItem[]> | undefined

    if (footnotes.length > 0) {
      // Pass 1: layout without reserved heights to find which page each ref lands on
      const pass1Layout = layoutDocument(blocks, measures, layoutOptions)

      const footnoteRefs = collectFootnoteRefs(blocks)
      const pageFootnoteMap = mapFootnotesToPages(pass1Layout.pages, footnoteRefs)

      // Build footnotesByPage text items in document order
      footnotesByPage = new Map<number, FootnoteRenderItem[]>()
      let displayNumber = 1
      const seen = new Set<number>()

      for (const ref of footnoteRefs) {
        if (seen.has(ref.footnoteId)) continue
        seen.add(ref.footnoteId)

        const fn = footnotes.find(
          (f) => f.id === ref.footnoteId && (f.noteType === 'normal' || f.noteType == null)
        )
        if (!fn) continue

        for (const [pageNum, ids] of pageFootnoteMap) {
          if (!ids.includes(ref.footnoteId)) continue
          const existing = footnotesByPage.get(pageNum) ?? []
          existing.push({ displayNumber: String(displayNumber), text: getFootnoteText(fn) })
          footnotesByPage.set(pageNum, existing)
          break
        }
        displayNumber++
      }

      // Measure the real rendered height of each page's footnote area
      const reservedHeights = new Map<number, number>()
      for (const [pageNum, items] of footnotesByPage) {
        const h = measureFootnoteAreaHeight(items, contentWidth)
        if (h > 0) reservedHeights.set(pageNum, h)
      }

      // Pass 2: re-layout with accurate reserved heights
      const pass2Layout = layoutDocument(blocks, measures, {
        ...layoutOptions,
        footnoteReservedHeights: reservedHeights,
      })

      const blockLookup: BlockLookup = new Map()
      blocks.forEach((block, i) => {
        blockLookup.set(String(block.id), { block, measure: measures[i] })
      })

      if (container.value) {
        renderPages(pass2Layout.pages, container.value, {
          blockLookup,
          footnotesByPage,
          showShadow: true,
          pageGap: 24,
        })
      }
    } else {
      // No footnotes — single pass
      const layout = layoutDocument(blocks, measures, layoutOptions)

      const blockLookup: BlockLookup = new Map()
      blocks.forEach((block, i) => {
        blockLookup.set(String(block.id), { block, measure: measures[i] })
      })

      if (container.value) {
        renderPages(layout.pages, container.value, {
          blockLookup,
          showShadow: true,
          pageGap: 24,
        })
      }
    }

    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof Error ? err.message : String(err)
    console.error('[DocxViewer]', err)
  }
}

onMounted(load)

onUnmounted(() => {
  if (container.value) container.value.innerHTML = ''
})
</script>

<template>
  <div class="docx-viewer">
    <div v-if="status === 'loading'" class="docx-viewer__loading">
      <span class="docx-viewer__spinner" role="status" aria-label="Loading" />
      Loading document…
    </div>
    <div
      v-else-if="status === 'error'"
      class="docx-viewer__error"
      role="alert"
    >
      {{ errorMessage }}
    </div>
    <div
      v-show="status === 'ready'"
      ref="container"
      class="docx-viewer__canvas"
      role="document"
      aria-label="Document viewer"
    />
  </div>
</template>

<style scoped>
.docx-viewer {
  width: 100%;
  min-height: 100vh;
  background: #e8e8e8;
}

.docx-viewer__canvas {
  width: 100%;
  min-height: 100vh;
}

.docx-viewer__loading,
.docx-viewer__error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 100vh;
  font-family: system-ui, sans-serif;
  font-size: 14px;
  color: #555;
}

.docx-viewer__error {
  color: #c0392b;
}

.docx-viewer__spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #ccc;
  border-top-color: #444;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
