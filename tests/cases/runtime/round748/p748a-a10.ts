// xl:title 标签：`break` 打在 `switch` 与 `try` 上
// xl:round 748
// xl:judge stdout
// xl:end
sw: switch (1) { case 1: console.log("case1"); break sw; console.log("no"); }
console.log("after switch");
t: try { console.log("in try"); } finally { console.log("finally"); }
console.log("after try");
w: while (true) { try { break w; } finally { console.log("wfin"); } }
console.log("after while");
