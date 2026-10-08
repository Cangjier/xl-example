// xl:title 同名遮蔽：块 / 函数 / catch / 参数
// xl:judge stdout
// xl:end

let x = "global";
function f(x: string): string { { let x = "block"; return x; } }
console.log(x, f("param"), (() => { const x = "lambda"; return x; })());
try { throw "err"; } catch (x) { console.log("catch", x); }
