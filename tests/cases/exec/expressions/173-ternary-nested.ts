// xl:title 嵌套三元与短路求值次数
// xl:round 691
// xl:judge stdout
// xl:end
let n = 0;
const t = (x: any) => { n++; return x; };
const v = t(0) ? t(1) : t(2) ? t(3) : t(4);
console.log(v, n);
console.log((false || "a") && "b", (null ?? "c") || "d");
// 第 787 轮并进来的两条（`probe693b-e67` / `e68`）：三元只求值被选中的那一支
console.log((true ? 1 : 2) + (false ? 1 : 2));
console.log((function () { const a = 1; return a > 0 ? "p" : "n"; })());
