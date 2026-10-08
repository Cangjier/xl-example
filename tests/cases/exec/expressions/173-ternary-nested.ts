// xl:title 嵌套三元与短路求值次数
// xl:round 691
// xl:judge stdout
// xl:end
let n = 0;
const t = (x: any) => { n++; return x; };
const v = t(0) ? t(1) : t(2) ? t(3) : t(4);
console.log(v, n);
console.log((false || "a") && "b", (null ?? "c") || "d");
