// xl:title 错误与收尾：错误家族的 name / instanceof、cause 与 errors、catch 不绑名、finally 覆盖 return、抛非错误
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收 `exec/round707` 里逐条一问的 5 条探针
// （`p707b-e01` … `p707b-e05`）。正文逐字搬进各自的 IIFE。
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

(() => {
  const es = [new TypeError("t"), new RangeError("r"), new SyntaxError("s")];
  console.log(show(es.map((e) => e.name).join("|")) + "," + show(es[0] instanceof Error));
})();
(() => {
  const e = new Error("m", { cause: 1 });
  console.log(show(e.cause) + "," + show(e.message));
  const a = new AggregateError([1, 2], "agg");
  console.log(show(a.errors.length) + "," + show(a.message));
})();
(() => {
  try { throw new Error("x"); } catch { console.log("caught"); }
})();
(() => {
  function f() { try { return 1; } finally { return 2; } }
  console.log(show(f()));
})();
(() => {
  try { throw "str"; } catch (e) { console.log(show(e)); }
  try { throw { code: 1 }; } catch (e) { console.log(show(e.code)); }
})();
