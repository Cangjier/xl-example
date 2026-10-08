// xl:title `try` / `finally` 里 `return` 覆盖与 `finally` 的抛
// xl:round 736
// xl:judge stdout
// xl:end
function f() { try { return "try"; } finally { return "finally"; } }
console.log(f());
function g() { try { return "try"; } finally { console.log("clean"); } }
console.log(g());
function h() { try { throw new Error("e"); } finally { return "swallow"; } }
console.log(h());
