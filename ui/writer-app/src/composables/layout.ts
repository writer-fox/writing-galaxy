import { onMounted } from 'vue'

const LAYOUT_PROPS = { '--act-w': 48, '--ai-w': 248, '--exp-w': 264 } as const

/** 初始化三栏宽度（body 上的 CSS 变量，grid 消费）。 */
function initWidths() {
  const root = document.body
  for (const [prop, val] of Object.entries(LAYOUT_PROPS)) {
    if (!root.style.getPropertyValue(prop)) {
      root.style.setProperty(prop, `${val}px`)
    }
  }
}

/**
 * 分栏拖拽调整。
 * 每个 resizer 关联若干列变量，sign 决定拖动方向正负，min/max 钳制。
 */
function attachResizer(
  handle: HTMLElement | null,
  map: { prop: string; sign: 1 | -1; min: number; max: number }[]
) {
  if (!handle) return
  let startX = 0
  let startVals = new Map<string, number>()
  let dragging = false

  const read = (prop: string) =>
    parseInt(document.body.style.getPropertyValue(prop)) ||
    (LAYOUT_PROPS as Record<string, number>)[prop]

  const down = (e: PointerEvent) => {
    e.preventDefault()
    startX = e.clientX
    startVals = new Map(map.map((m) => [m.prop, read(m.prop)]))
    handle.setPointerCapture?.(e.pointerId)
    handle.classList.add('dragging')
    document.body.classList.add('col-resizing')
    dragging = true
  }
  const move = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - startX
    for (const m of map) {
      let v = Math.round((startVals.get(m.prop) || 0) + m.sign * dx)
      v = Math.max(m.min, Math.min(m.max, v))
      document.body.style.setProperty(m.prop, `${v}px`)
    }
  }
  const stop = () => {
    dragging = false
    handle.classList.remove('dragging')
    document.body.classList.remove('col-resizing')
  }
  handle.addEventListener('pointerdown', down)
  handle.addEventListener('pointermove', move)
  handle.addEventListener('pointerup', stop)
  handle.addEventListener('pointercancel', stop)

  const cleanup = () => {
    handle.removeEventListener('pointerdown', down)
    handle.removeEventListener('pointermove', move)
    handle.removeEventListener('pointerup', stop)
    handle.removeEventListener('pointercancel', stop)
  }
  return cleanup
}

export function useLayoutResize() {
  onMounted(() => {
    initWidths()
    attachResizer(document.getElementById('r-ai'), [
      // AI 栏右缘：向右拖（dx>0）AI 变宽
      { prop: '--ai-w', sign: 1, min: 200, max: 460 },
    ])
    attachResizer(document.getElementById('r-exp'), [
      // 内容树左缘：向左拖（dx<0）内容树变宽 → sign=-1
      { prop: '--exp-w', sign: -1, min: 220, max: 520 },
    ])
  })
}
