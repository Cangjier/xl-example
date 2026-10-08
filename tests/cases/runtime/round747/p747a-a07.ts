// xl:title `try` / `catch` / `finally` 与 `return` / `continue` 的次序
// xl:round 747
// xl:judge stdout
// xl:end
function f() { try { return "try"; } finally { console.log("fin1"); } }
console.log(f());
function g() { try { return "a"; } finally { return "b"; } }
console.log(g());
function h() { try { throw new Error("x"); } catch (e) { return "c"; } finally { console.log("fin2"); } }
console.log(h());
function i() {
  for (const v of [1, 2, 3]) {
    try { if (v === 2) continue; console.log("body" + v); } finally { console.log("f" + v); }
  }
}
i();
function j() {
  let s = "";
  try { s += "t"; throw new Error("e"); } catch { s += "c"; } finally { s += "f"; }
  return s;
}
console.log(j());
