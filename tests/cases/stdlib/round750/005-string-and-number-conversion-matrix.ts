// xl:title `String` / `Number` 的显式转换矩阵
// xl:round 750
// xl:judge stdout
// xl:end
const vals: any[] = [undefined, null, true, false, 0, -0, 1, NaN, "", " ", "1", "a", [], [1], [1, 2], {}, { toString() { return "T"; } }];
for (const v of vals) console.log(typeof v, String(v), v == null ? "-" : Number(v));
console.log(String(Symbol("s")).startsWith("Symbol("));
console.log(String(Symbol()) === "Symbol()", String(Symbol("a")) === "Symbol(a)");
