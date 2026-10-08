// xl:title 走不到的 `case` 表达式即使会抛也不抛
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  switch (x) {
    case 1: return "one";
    case (() => { throw new Error("boom"); })(): return "never";
  }
  return "rest";
}
console.log(f(1));
try { console.log(f(2)); } catch (e: any) { console.log("caught", e.message); }
