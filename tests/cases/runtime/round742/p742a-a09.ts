// xl:title `switch` 里的 `return` 与 `throw`
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  switch (x) {
    case 1: return "one";
    case 2: throw new Error("two");
  }
  return "rest";
}
console.log(f(1));
try { f(2); } catch (e: any) { console.log("caught", e.message); }
console.log(f(3));
