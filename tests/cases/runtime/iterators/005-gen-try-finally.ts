// xl:title 生成器里的 `try` / `finally`（提前 `return` 时也要跑）
// xl:judge stdout
// xl:end

function* g(): any {
  try { yield 1; yield 2; } finally { console.log("cleanup"); }
}
const it = g();
console.log(it.next().value, it.next().value, it.next().done);
function* h(): any { try { yield 1; return "early"; } finally { console.log("h-cleanup"); } }
const it2 = h();
console.log(it2.next().value, it2.next().value);
