const B = 'http://localhost:8080/api'
const j = (r) => r.json()
let fail = 0
const ok = (name, cond) => { if (!cond) { console.log('FAIL', name); fail++; } else console.log('OK  ', name) }

// 1. 作品列表（空）
let r = await fetch(`${B}/works`); let works = await r.json()
console.log('initial works =', JSON.stringify(works))

// 2. 新建作品
r = await fetch(`${B}/works`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '大泽界', genre: '玄幻' }) })
const work = await j(r); ok('create work', r.status === 201 && work.id)
const wid = work.id
console.log('created work id=', wid)

// 3. 新建 3 章（追加）
for (let i = 0; i < 3; i++) {
  r = await fetch(`${B}/chapters?workId=${wid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
  const c = await j(r)
  console.log('   created chapter sort=', c.sortOrder)
}
r = await fetch(`${B}/works/${wid}/tree`); let chapters = await r.json()
console.log('chapters=', chapters.map(c => `${c.id}:${c.sortOrder} ${c.title}`).join(' | '))
ok('3 chapters sequential 1,2,3', chapters.length === 3 && chapters[0].sortOrder === 1 && chapters[2].sortOrder === 3)

// 4. 在第 1 章后插入一章 → 应得到 1,[new],2,3 即 4 章紧凑 1..4
r = await fetch(`${B}/chapters?workId=${wid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '插入章', afterSortOrder: 1 }) })
const inserted = await j(r)
r = await fetch(`${B}/works/${wid}/tree`); chapters = await r.json()
console.log('after insert from sort=1:', chapters.map(c => `${c.id}:${c.sortOrder}`).join(' | '))
ok('4 chapters compact 1..4', chapters.length === 4 && chapters.map(c => c.sortOrder).join(',') === '1,2,3,4')
ok('inserted placed at 2', chapters[1].id === inserted.id && inserted.sortOrder === 2)

// 5. 更新章节标题/正文
r = await fetch(`${B}/chapters/${inserted.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '叛门', content: '夜色像靛墨。' }) })
const upd = await j(r); ok('update chapter', upd.title === '叛门' && upd.content === '夜色像靛墨。')

// 6. 删除第 1 章 → 剩余 3 章紧凑 1,2,3
const firstId = chapters[0].id
r = await fetch(`${B}/chapters/${firstId}?workId=${wid}`, { method: 'DELETE' })
r = await fetch(`${B}/works/${wid}/tree`); chapters = await r.json()
console.log('after delete ch1:', chapters.map(c => `${c.id}:${c.sortOrder}`).join(' | '))
ok('3 chapters compact after delete', chapters.length === 3 && chapters.map(c => c.sortOrder).join(',') === '1,2,3')

console.log(fail === 0 ? '>>> ALL SMOKE TESTS PASSED' : `>>> ${fail} FAILURES`)
