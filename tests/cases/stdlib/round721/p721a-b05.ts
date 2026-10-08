// xl:title defineProperty 的 length：加长（空洞与 JSON）
// xl:round 721
// xl:judge stdout
// xl:want differ
// xl:why 同上另一半：`defineProperty(a, "length", { value: 4 })` **加长**也要补洞
// xl:why （JS 给 `[1,2,null,null]`）。两条一起说明「`length` 那一格要一个能写长度、
// xl:why 带一个可写标志位的落点」——那要 `HeapArray` 上多一格标志位。
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2];
Object.defineProperty(a, "length", { value: 4 });
console.log(show(a.length) + "," + show(a[3]) + "," + show(JSON.stringify(a)) + "," + show(Object.keys(a).join(",")));
