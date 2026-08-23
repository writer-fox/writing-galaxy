<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ForceGraph3D from '3d-force-graph'
import {
  AdditiveBlending, AmbientLight, BoxGeometry, BufferAttribute,
  BufferGeometry, CanvasTexture, Color, ConeGeometry, DirectionalLight, EdgesGeometry,
  Group, Line, LineBasicMaterial, LineSegments, Mesh,
  MeshStandardMaterial, Points, PointsMaterial, QuadraticBezierCurve3, Scene,
  SphereGeometry, Sprite, SpriteMaterial, Vector2, Vector3,
} from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { GraphNode } from '../../stores/graph'

const props = defineProps<{
  nodes: GraphNode[]
  links: Array<{ source: string; target: string; color: string; width: number; directed: boolean; label: string }>
  is2d: boolean
}>()

const emit = defineEmits<{ (e: 'node-click', node: GraphNode): void }>()

const host = ref<HTMLDivElement | null>(null)
let fg: any = null
let composer: EffectComposer | null = null
let labelRenderer: CSS2DRenderer | null = null
let rafId = 0

/* ---------- 深空配色 ---------- */
const DEEP_SPACE = {
  character: 0x4fd1c5, // 星青
  faction: 0x7fb4ff,   // 星靛
}

/* ---------- 节点光晕贴图（缓存） ---------- */
const glowCache = new Map<string, CanvasTexture>()
function getGlow(color: Color): CanvasTexture {
  const key = color.getHexString()
  let tex = glowCache.get(key)
  if (tex) return tex
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 60)
  const r = (color.r * 255) | 0, g = (color.g * 255) | 0, b = (color.b * 255) | 0
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(0.15, `rgba(${r},${g},${b},0.55)`)
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.15)`)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  tex = new CanvasTexture(canvas)
  tex.colorSpace = 'srgb'
  glowCache.set(key, tex)
  return tex
}

/* ---------- 名字标签（CSS2D，脱离 bloom，永远清晰 + 蓝色高光） ---------- */
function makeLabel(text: string, big: boolean): CSS2DObject {
  const div = document.createElement('div')
  div.textContent = text
  div.style.color = big ? 'rgba(255,255,255,0.96)' : 'rgba(210,222,240,0.88)'
  div.style.font = `${big ? 600 : 500} ${big ? 14 : 12}px/1 system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`
  div.style.textShadow = big
    ? '0 0 8px rgba(150,190,255,0.85), 0 1px 2px rgba(0,0,0,0.95)'
    : '0 0 5px rgba(120,170,255,0.7), 0 1px 2px rgba(0,0,0,0.9)'
  div.style.whiteSpace = 'nowrap'
  div.style.pointerEvents = 'none'
  div.style.userSelect = 'none'
  return new CSS2DObject(div)
}

/* ---------- 节点：小亮核 + 大光晕（bloom 接管高光，星点感） ---------- */
function nodeCoreRadius(d: GraphNode): number {
  const isFaction = d.type === 'faction'
  return (isFaction ? 0.9 : 0.6) + d.importance * (isFaction ? 1.3 : 0.7)
}

function makeNodeObject(d: GraphNode): Group {
  const isFaction = d.type === 'faction'
  const color = new Color(d.color || (isFaction ? DEEP_SPACE.faction : DEEP_SPACE.character))
  const r = nodeCoreRadius(d)
  const group = new Group()
  const mat = new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: isFaction ? 0.2 : 0.8, metalness: 0, roughness: 1 })

  // 主体：人物=球体；势力=小房子（房身 + 四棱锥屋顶），加白色描边让轮廓在 bloom 下可见
  if (isFaction) {
    const bodyGeo = new BoxGeometry(r * 2.0, r * 1.5, r * 2.0)
    group.add(new Mesh(bodyGeo, mat))
    group.add(new LineSegments(new EdgesGeometry(bodyGeo), new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })))
    const roofGeo = new ConeGeometry(r * 1.7, r * 1.3, 4)
    const roof = new Mesh(roofGeo, mat)
    roof.rotation.y = Math.PI / 4
    roof.position.y = r * 1.5 + r * 0.65
    group.add(roof)
    const roofEdges = new LineSegments(new EdgesGeometry(roofGeo), new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }))
    roofEdges.rotation.y = Math.PI / 4
    roofEdges.position.y = roof.position.y
    group.add(roofEdges)
  } else {
    group.add(new Mesh(new SphereGeometry(r, 16, 12), mat))
  }

  // 光晕 sprite（加性混合，柔光）；势力不加球状光晕，避免盖住房子造型，靠 emissive+bloom 自发光
  if (!isFaction) {
    const glow = new Sprite(new SpriteMaterial({
      map: getGlow(color), transparent: true, opacity: 0.6, depthWrite: false, blending: AdditiveBlending,
    }))
    const glowSize = r * 4
    glow.scale.set(glowSize, glowSize, 1)
    group.add(glow)
  }

  // 名字标签（CSS2D，脱离 bloom，清晰高光）
  // data-node-id 用于每帧清理孤立标签（节点被过滤时其标签 DOM 不会自动移除）
  const name = makeLabel(d.name, isFaction)
  name.element.dataset.nodeId = String(d.id)
  name.position.set(0, r + (isFaction ? 2.6 : 2.2), 0)
  group.add(name)
  if (!isFaction && d.factionName) {
    const tag = makeLabel('· ' + d.factionName, false)
    tag.element.dataset.nodeId = String(d.id)
    tag.position.set(0, -r - 1.6, 0)
    group.add(tag)
  }
  return group
}

/* ---------- Bezier 曲线边（星河旋臂感） ---------- */
const tmpV1 = new Vector3()
const tmpV2 = new Vector3()
const tmpMid = new Vector3()

function makeLinkObject(link: any): Line {
  const geo = new BufferGeometry().setFromPoints([new Vector3(), new Vector3(), new Vector3()])
  const mat = new LineBasicMaterial({
    color: new Color(link.color || 0x8d9199),
    transparent: true, opacity: 0.5, depthWrite: false,
  })
  return new Line(geo, mat)
}

function updateLinkPosition(lineObj: Line, coords: any): void {
  const s = coords.start, e = coords.end
  tmpV1.set(s.x, s.y, s.z)
  tmpV2.set(e.x, e.y, e.z)
  tmpMid.set((s.x + e.x) / 2, (s.y + e.y) / 2, (s.z + e.z) / 2)
  // 垂直弓曲：在 xy 平面内取垂直方向偏移中点
  const dx = e.x - s.x, dy = e.y - s.y, dz = e.z - s.z
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
  const bow = dist * 0.18
  tmpMid.x += (-dy / dist) * bow
  tmpMid.y += (dx / dist) * bow
  const curve = new QuadraticBezierCurve3(tmpV1.clone(), tmpMid.clone(), tmpV2.clone())
  const pts = curve.getPoints(10)
  lineObj.geometry.setFromPoints(pts)
  ;(lineObj.geometry.attributes.position as BufferAttribute).needsUpdate = true
}

/* ---------- 背景星尘 ---------- */
let stars: Points | null = null
function addStars(scene: Scene) {
  if (stars || !scene) return
  // 纯色深空背景：渐变会有 banding（横向拉丝），噪点会有颗粒感（脏），纯色最干净
  scene.background = new Color(0x05070d)

  const count = 900
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    // 球内均匀随机分布，避免立方体边界在镜头拉远时露馅
    const r = Math.cbrt(Math.random()) * 400
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
  }
  // 圆形光斑贴图：PointsMaterial 默认方形点，镜头拉近会露出方边，改用径向渐变光斑
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 32, 32)
  const starTex = new CanvasTexture(c)
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(positions, 3))
  const mat = new PointsMaterial({
    color: 0x9fc4ff,
    size: 2,
    map: starTex,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: false, // 固定像素大小：近处不放大成方块，远处不缩小到看不见
    alphaTest: 0.05,
    depthWrite: false,
  })
  stars = new Points(geo, mat)
  scene.add(stars)
}

/* ---------- 主流程 ---------- */
function build() {
  if (!host.value || fg) return
  // CSS2D 标签渲染器：标签脱离 bloom 后处理，永远清晰
  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(host.value.clientWidth, host.value.clientHeight)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.top = '0'
  labelRenderer.domElement.style.left = '0'
  labelRenderer.domElement.style.pointerEvents = 'none'
  host.value.appendChild(labelRenderer.domElement)

  fg = new ForceGraph3D(host.value!, { controlType: 'orbit', extraRenderers: [labelRenderer] })
  // 限定镜头距离：避免拉远到星尘边界外或看不清节点
  const controls = fg.controls()
  controls.maxDistance = 400
  controls.minDistance = 30
  applyView()
  applyData()

  fg.showNavInfo(false)
  fg.backgroundColor('rgba(0,0,0,0)')
  fg.nodeVal(1)
  fg.nodeThreeObject(makeNodeObject)
  fg.nodeThreeObjectExtend(false)
  fg.nodeLabel((d: any) => `${d.name} · ${d.type === 'faction' ? '势力' : '人物'}`)

  fg.linkThreeObject(makeLinkObject)
  fg.linkThreeObjectExtend(false)
  fg.linkPositionUpdate(updateLinkPosition)
  fg.linkColor((d: any) => d.color)
  fg.linkOpacity(0.5)
  fg.linkLabel((d: any) => d.label || '')
  // 用 linkThreeObject 后箭头基于直线，与曲线不贴合，先关闭
  fg.linkDirectionalArrowLength(0)
  fg.onNodeClick((node: any) => emit('node-click', node as GraphNode))

  const scene = fg.scene()
  scene.add(new AmbientLight(0x3a4a66, 0.6))
  const sun = new DirectionalLight(0xfff5e0, 1.0)
  sun.position.set(80, 60, 60)
  scene.add(sun)
  const rim = new DirectionalLight(0x4f9df0, 0.4)
  rim.position.set(-60, -30, -40)
  scene.add(rim)
  addStars(scene)

  setupBloom()
  resize()
  window.addEventListener('resize', resize)
  // 布局稳定后自动适配视角，让节点充满视图（房子造型才看得清）
  fg.onEngineStop(() => { try { fg.zoomToFit(0, 300, 2) } catch { /* 老版本 zoomToFit 依赖 nodeFilter 会抛，忽略 */ } })
}

/* ---------- UnrealBloomPass 后处理（劫持 renderer.render，不接管主循环） ---------- */
function setupBloom() {
  if (!fg || !host.value) return
  const renderer = fg.renderer()
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(fg.scene(), fg.camera()))
  const bloom = new UnrealBloomPass(
    new Vector2(host.value.clientWidth, host.value.clientHeight),
    0.35, // strength
    0.45, // radius
    0.65  // threshold（提高：只让真正亮的像素发光，暗部保持纯黑不发灰）
  )
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  // 劫持 renderer.render：3d-force-graph 主循环每次 render 时改走 composer；
  // 用 inComposer flag 防止 RenderPass 内部再调 renderer.render 时递归
  const originalRender = renderer.render.bind(renderer)
  let inComposer = false
  renderer.render = function (scene: any, camera: any) {
    if (inComposer) return originalRender(scene, camera)
    inComposer = true
    try { composer!.render() } finally { inComposer = false }
    // 每帧清理孤立的 CSS2D 标签：3d-force-graph 移除节点时不会自动清理其 DOM element，
    // 快速过滤节点（拖重要性滑块）会导致标签残留。按 data-node-id 比对当前节点集合移除孤立标签。
    if (labelRenderer) {
      const currentIds = new Set(props.nodes.map((n: any) => String(n.id)))
      const children = labelRenderer.domElement.children
      for (let i = children.length - 1; i >= 0; i--) {
        const el = children[i] as HTMLElement
        const nid = el.dataset?.nodeId
        if (nid && !currentIds.has(nid)) {
          labelRenderer.domElement.removeChild(el)
        }
      }
    }
  } as any
}

function applyData() {
  if (!fg) return
  fg.graphData({ nodes: props.nodes, links: props.links })
  // 孤立标签的清理由劫持的 renderer.render 每帧执行（按 data-node-id 比对），无需在此清空全部 DOM
}
function applyView() {
  if (!fg) return
  if (props.is2d) fg.cameraPosition({ x: 0, y: 0, z: 220 }, { x: 0, y: 0, z: 0 }, 400)
  else fg.cameraPosition({ x: 120, y: 95, z: 150 }, { x: 0, y: 0, z: 0 }, 500)
}
function resize() {
  if (fg && host.value) {
    const w = host.value.clientWidth || 600
    const h = host.value.clientHeight || 400
    fg.width(w).height(h)
    composer?.setSize(w, h)
    labelRenderer?.setSize(w, h)
  }
}

onMounted(async () => { await nextTick(); build() })
onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  if (applyTimer) clearTimeout(applyTimer)
  window.removeEventListener('resize', resize)
  if (labelRenderer && host.value && labelRenderer.domElement.parentNode === host.value) {
    host.value.removeChild(labelRenderer.domElement)
  }
  fg?._destructor()
  fg = null
  composer = null
  labelRenderer = null
  glowCache.clear()
})
let applyTimer: ReturnType<typeof setTimeout> | null = null
watch(() => [props.nodes, props.links, props.is2d], () => {
  if (!fg) return
  applyView()
  // debounce：快速拖重要性滑块时避免频繁重建图，减少 CSS2D 标签残留与卡顿
  if (applyTimer) clearTimeout(applyTimer)
  applyTimer = setTimeout(() => applyData(), 120)
})
</script>

<template>
  <div ref="host" class="graph3d"></div>
</template>

<style scoped>
.graph3d {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 38%, #1b2740 0%, #111827 46%, #070a12 78%, #04060b 100%);
}
</style>
