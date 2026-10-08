// xl:title `try` 里 `return` 与 `finally` 同时给值：`finally` 赢
// xl:round 748
// xl:judge stdout
// xl:end
function f() { try { return 1; } finally { return 2; } }
console.log(f());
function g() { let v = 0; try { return "a"; } finally { v = 1; console.log("side", v); } }
console.log(g());
function h() { for (const x of [1, 2]) { try { if (x === 1) return "first"; } finally { console.log("f" + x); } } return "end"; }
console.log(h());
