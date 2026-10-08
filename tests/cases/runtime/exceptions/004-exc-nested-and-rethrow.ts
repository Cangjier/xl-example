// xl:title 嵌套 try + 重抛 + catch 里再抛
// xl:judge stdout
// xl:end

function inner(): string {
  try { throw new Error("inner"); } catch (e: any) { return "caught:" + e.message; }
}
function outer(): string {
  try { return inner(); } finally { console.log("outer-finally"); }
}
console.log(outer());
try {
  try { throw new Error("first"); }
  catch (e: any) { throw new Error("wrapped:" + e.message); }
} catch (e: any) { console.log("top", e.message); }
