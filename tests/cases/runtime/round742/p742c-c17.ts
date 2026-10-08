// xl:title 嵌套 `try` 的 `finally` 顺序与 `catch` 里的 `return`
// xl:round 742
// xl:judge stdout
// xl:end
const log: string[] = [];
function f(): string {
  try {
    try { throw new Error("x"); } finally { log.push("inner"); }
  } catch (e: any) { log.push("catch"); return "c"; } finally { log.push("outer"); }
}
console.log(f(), log.join(","));
