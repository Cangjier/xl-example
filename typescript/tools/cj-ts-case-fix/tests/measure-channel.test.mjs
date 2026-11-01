// 对拍通道的回归测试：宿主进程把 build/ts 的模块留在内存里时，对拍不能继续吃那份旧实现。
//
// 这一条来自一次真实事故：改完 shape 实现、`xl build` + `tsc` 都成功、门禁全绿，但 `case_fix`
// 的验收一直报「10/16 一致」——它量的是宿主进程里早就载入的旧模块，删 `require.cache` 也换不回来。
// 现在 `traceActual` 有两条通道，这里钉住：`fresh: true` 必定走子进程；本进程载入之后磁盘变过，
// 也必须改走子进程。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inProcessStale, parserAvailable, traceActual } from '../../shape-actual.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const CASE = path.join(ROOT, 'typescript', 'cases', 'tts', 'success', 'types', 'alias-conditional-infer.ts')
const ENTRY = path.join(ROOT, 'build', 'ts', 'typescript', 'shapes', 'files', 'source-file-shape.js')

test('对拍通道：fresh 走子进程，两条通道量的是同一份 build/ts', (t) => {
  if (!parserAvailable()) {
    t.skip('build/ts 不存在：先跑 npm run build')
    return
  }
  const source = fs.readFileSync(CASE, 'utf8')
  const inProcess = traceActual(source, 'case.ts')
  const isolated = traceActual(source, 'case.ts', { fresh: true })

  assert.equal(inProcess.channel, 'process')
  assert.equal(isolated.channel, 'child')
  // 同一份 build/ts：两条通道的 created 必须逐节点相同（不然「换个通道」就换了口径）。
  assert.deepEqual([...isolated.created], [...inProcess.created])
})

test('对拍通道：载入之后 build/ts 变过，就不能再用本进程的模块', (t) => {
  if (!parserAvailable()) {
    t.skip('build/ts 不存在：先跑 npm run build')
    return
  }
  const source = fs.readFileSync(CASE, 'utf8')
  traceActual(source, 'case.ts')
  assert.equal(inProcessStale(), false)

  const stat = fs.statSync(ENTRY)
  const atime = stat.atimeMs / 1000
  const mtime = stat.mtimeMs / 1000
  try {
    // 只动 mtime：内容不变，但「磁盘已经不是载入时那一份」这件事必须被认出来。
    // 窗口内的断言都是确定性的（没有别的进程会在这几毫秒里重写 build/ts）；窗口外不再断言——
    // 恢复 mtime 受文件系统精度影响，不该拿它当判据。
    fs.utimesSync(ENTRY, atime, mtime + 5)
    assert.equal(inProcessStale(), true)
    assert.equal(traceActual(source, 'case.ts').channel, 'child')
  } finally {
    fs.utimesSync(ENTRY, atime, mtime)
  }
})
