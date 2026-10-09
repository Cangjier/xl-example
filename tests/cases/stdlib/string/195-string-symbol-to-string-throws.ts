// xl:title `"a" + Symbol()` 与 `${Symbol()}` 该抛 `TypeError`
// xl:round 693
// xl:judge stdout
// xl:end
// 判定点只有一个：**符号是 `ToString` 表上唯一的例外**——
// `String(sym)` 走的是 `ToString(sym)` 的**描述**那一档（给 `"Symbol(x)"`），
// 而 `"" + sym` / 模板串里的那一次 `ToPrimitive(…, string)` **该抛 `TypeError`**。
//
// 这两档必须分开记：`String(sym)` 那一面已经在 `194-string-tostring-of-values` 里，
// 而「抛」这一面单独钉在这里（合并前它是 `probe693-y43`，一条只问这一件事的原子探针）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const sym = Symbol("x");

try {
  console.log(show(String(sym)));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
try {
  console.log(show("" + sym));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
try {
  console.log(show(`${sym}`));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
