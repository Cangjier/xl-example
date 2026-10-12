// xl:title 全局强制转换：Number / String / Boolean 的一览
// xl:round 371
// xl:judge stdout
// xl:end
const vals: any[] = [undefined, null, true, false, 0, -0, 1, "", "x", "0", " 1 ", [], [1], [1, 2], {}, NaN];
console.log(vals.map((v) => String(v)).join("|"));
console.log(vals.map((v) => (v ? 1 : 0)).join(""));
console.log(vals.map((v) => Number(v)).join(","));
