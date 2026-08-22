const B = 'http://localhost:8080/api'
const j = (r) => r.json()
let fail = 0
const ok = (n, c) => { if (!c) { console.log('FAIL', n); fail++; } else console.log('OK  ', n) }

// 找 demo 作品
const works = await j(await fetch(`${B}/works`))
const wid = works.find(w => w.title === '大泽界').id
console.log('demo work id =', wid)

// god 全量
let r = await fetch(`${B}/works/${wid}/graph?mode=god`)
let g = await j(r)
console.log('GOD nodes=', g.nodes.length, 'links=', g.links.length)
ok('god has 8 nodes (4 char + 4 faction)', g.nodes.length === 8)
ok('god has 10 links', g.links.length === 10)
// check node fields
const nm = g.nodes.filter(n => n.name === '林动')[0]
ok('node has id c-prefix + factionName', nm.id === 'c1' && nm.factionName === '元门' && nm.size > 14)
const ally = g.links.find(l => l.label === '结盟')
ok('ally link directed=false', ally && ally.directed === false)
const belong = g.links.filter(l => l.label === '从属')[0]
ok('belong link directed=true', belong && belong.directed === true)

// timeline sort=1
r = await fetch(`${B}/works/${wid}/graph?mode=timeline&sort=1`)
g = await j(r)
const names1 = g.nodes.map(n => n.name).sort()
console.log('S1 nodes=', names1.join(','))
ok('S1 only first-sort<=1 entities', g.nodes.length === 4) // 4 势力 early? 元门/应家 first=1, 大泽界 first=3, 刑律堂 first=2 → S1: 元门、应家 + 林动、应无涯 = 4
ok('S1 no lover (starts sort 3)', !g.links.some(l => l.label === '情侣'))
ok('S1 has 亲师 tied at sort1? no—master_disciple at 1, count>=2', g.links.length >= 2)

// timeline sort=2
r = await fetch(`${B}/works/${wid}/graph?mode=timeline&sort=2`)
g = await j(r)
ok('S2 includes 刑律堂(f4) & 四长老', g.nodes.some(n=>n.name==='刑律堂') && g.nodes.some(n=>n.name==='四长老'))
ok('S2 still no 青萝/大泽界 (first=3)', !g.nodes.some(n=>n.name==='青萝') && !g.nodes.some(n=>n.name==='大泽界'))

// timeline sort=3
r = await fetch(`${B}/works/${wid}/graph?mode=timeline&sort=3`)
g = await j(r)
ok('S3 all 8 nodes', g.nodes.length === 8)
ok('S3 has lover link', g.links.some(l => l.label === '情侣'))

console.log(fail === 0 ? '>>> GRAPH SMOKE ALL PASSED' : `>>> ${fail} FAILURES`)
