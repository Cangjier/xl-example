// xl:title 生成器里 `return` / `finally` 的次序（`for..of` 提前退出）
// xl:round 737
// xl:judge stdout
// xl:want differ
// xl:why `it.return(9)` 打在**一次都没跑过**的生成器上：JS 不执行函数体、当场给
// xl:why `{ value: 9, done: true }`，本仓跑到第一个 `yield` 停下（给 `{ value: 1, done: false }`，
// xl:why **静默错值**）。第 713 轮试过收它——在 `DoIterNext` 里按「函数体开始跑过没有」拦一档，
// xl:why **实测 128 条回归**（`returns` 那一路与「正常恢复」共用同一个入口），当场回退，
// xl:why 台账留在 `runtime/iterators/probe694-g04`（这一条是同一个形状的另一个排版）。
// xl:why 要收它得让**恢复那一步**也认得「这次是 return」。
// xl:end
const log: string[] = [];
function* g() {
  try { yield 1; yield 2; } finally { log.push("fin"); }
  log.push("after");
}
for (const v of g()) { log.push("got:" + v); if (v === 1) break; }
console.log(log.join("|"));
const log2: string[] = [];
function* h() { try { yield 1; } finally { log2.push("fin-h"); } }
const ih = h();
console.log(JSON.stringify(ih.return(9)), log2.join("|"), JSON.stringify(ih.next()));
