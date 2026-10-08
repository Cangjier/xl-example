// xl:title `throw` 后面跟 `&&` / `||` / `??` 与嵌套链
// xl:round 738
// xl:judge stdout
// xl:end
function f(x: any) { throw x && new Error("a"); }
function g(x: any) { throw x ?? new Error("b"); }
function h(x: any) { throw (x || 1) && new Error("c"); }
for (const fn of [f, g, h]) {
  try { fn(0); console.log("no-throw"); } catch (e: any) { console.log(e.message); }
}
