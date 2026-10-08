// xl:title 生成器里 `return` / `finally` 的次序（`for..of` 提前退出）
// xl:round 737
// xl:judge stdout
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
