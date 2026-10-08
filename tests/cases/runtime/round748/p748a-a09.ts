// xl:title 标签：`break` 打在裸块 / `try` / 多层标签上
// xl:round 748
// xl:judge stdout
// xl:end
lbl: { console.log("in"); break lbl; console.log("unreachable"); }
console.log("after block");
first: second: for (let i = 0; i < 3; i++) { if (i === 1) continue first; if (i === 2) break second; console.log("L" + i); }
outer: for (let i = 0; i < 2; i++) { for (let j = 0; j < 2; j++) { if (j === 1) continue outer; console.log(i, j); } }
console.log("done");
