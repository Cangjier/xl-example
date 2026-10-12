// xl:title `trimLeft` / `trimRight`：别名同一格、行为与 trimStart / trimEnd 一致
// xl:round 718
// xl:judge stdout
// xl:end
// **第 794 轮（三）把同判定点的 2 条原子探针并了进来**（正文一字未改，只裹进带标签的 IIFE）。
// 判定点只有一个：**两个老别名与它们的正名是不是同一格、行为对不对得上**。
try { (function () { // probe: p718a-h10 `trimLeft` / `trimRight` 与 `trimStart` / `trimEnd` 是同一格
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (String.prototype as any).trimLeft === (String.prototype as any).trimStart));
console.log(t(() => (String.prototype as any).trimRight === (String.prototype as any).trimEnd));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { (function () { // probe: p718a-h11 两个别名的行为与 `trimStart` / `trimEnd` 一致
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => "  a  ".trimLeft() + "|" + "  a  ".trimRight()));
console.log(t(() => "\n\tab".trimLeft().length + "|" + "ab\n\t".trimRight().length));
console.log(t(() => "".trimLeft() + "|" + "   ".trimRight().length));
})(); }
catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
