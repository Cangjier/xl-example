// xl:title 异常：嵌套 `try` 的次序与 `finally` 里的返回
// xl:round 749
// xl:judge stdout
// xl:end
function f() {
  try {
    try { throw new Error("inner"); } finally { console.log("f1"); }
  } catch (e) { console.log("c1", (e as Error).message); return "r1"; } finally { console.log("f2"); }
}
console.log(f());
function g() { try { return "try"; } finally { console.log("gf"); } }
console.log(g());
function h() { try { throw "x"; } catch { console.log("no binding"); return "nb"; } }
console.log(h());
try { try { throw new Error("deep"); } finally { console.log("df"); } } catch (e) { console.log("outer", (e as Error).message); }
