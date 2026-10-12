// xl:title `split` 的 `limit` / 空分隔符 / 空串源 / 相邻分隔符
// xl:round 692
// xl:judge stdout
// xl:end
// **第 811 轮（合并）**：它那个判定点在 `stdlib/string` 里被写了 16 遍
//  （本文件 + 15 条已经被它吸收过、却一直留在盘上的来源）。这一轮把那些来源的正文
//  **逐字**接在下面（每块一个 IIFE、块首写明出处），**源文件从盘上删掉**；并组完整性由一把
//  一次性尺子核对：合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的
//  顺次相接」**逐字节相同**（两侧都中）。
// **合并了原先同一个判定点的二十二条**：
//   probe-s07 · probe3-y07 · probe693-y07 · probe693-y08 · probe693-y09 · probe693-y10 ·
//   probe693-y11 · probe694-y08 · probe694-y09 · probe695-y10 · probe696-s04 · probe696-s06 ·
//   probe699-s-e15 · probe699-s-e42 · probe699-s-e43 · probe703-s-e02 · probe703-s-e28 ·
//   probe704-s-e09 · probe704-s-e10 · probe704-s-e11 · probe705-s-g01 · probe705-s-g11
// 判定点只有一个：**`split` 的分段规则**——
//  ① `limit` 三档：正数截断、`0` 一段都不收、负数当「不限」；
//  ② 空分隔符按**码元**切成一段一个；
//  ③ 空串源：空分隔符给 `[]`、非空分隔符给 `[""]`；
//  ④ 相邻 / 头尾分隔符各自留一个空段。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show("a,b,c".split(",").length));
  console.log(show("a,b".split(",", 1).join("|")));
  console.log(show("a,b".split(",", 0).length));
  console.log(show("a,b".split(",", -1).length));
  console.log(show("abc".split("").join("|")));
  console.log(show("abc".split("", 2).join("|")));
  console.log(show("abc".split("", 2).length));
  console.log(show("abc".split("").length));
  console.log(show("".split(",").length));
  console.log(show("".split("").length));
  console.log(show("a,b,".split(",").length));
  console.log(show("a,b,,c".split(",").length));
  console.log(show("aa".split("a").length));
  console.log(show("abc".split().join("|")));
  console.log(show("abc".split("b").join("|")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

//  ---- 并自 047-string-split-limit-and-empty-r291.ts ----
(() => {
console.log("a,b,c".split(",").join("|"), "a,b,c".split(",", 2).join("|"));
console.log("abc".split("").join("-"), "".split(",").length, "a".split("").length);
})();

//  ---- 并自 082-string-split-forms-r330.ts ----
(() => {
console.log("abc".split("").join("-"));
console.log("a,b,,c".split(",").length, "a,b,,c".split(",")[2]);
console.log("a-b-c".split("-", 2).join("|"));
console.log("".split(",").length, "abc".split("").length);
})();

//  ---- 并自 095-string-split-limit-and-empty-r371.ts ----
(() => {
console.log(JSON.stringify("a,b,c".split(",", 2)));
console.log(JSON.stringify("abc".split("")));
console.log(JSON.stringify("".split(",")), JSON.stringify("".split("")));
console.log(JSON.stringify("a,,b".split(",")));
console.log(JSON.stringify("abc".split(undefined as any)));
})();

//  ---- 并自 114-string-split-negative-limit.ts ----
(() => {
console.log(JSON.stringify("a,b,c".split(",", -1)));
console.log(JSON.stringify("a,b,c".split(",", 0)));
console.log(JSON.stringify("a,b,c".split(",", 2)));
console.log(JSON.stringify("a,b,c".split(",", 9)));
console.log(JSON.stringify("abc".split("", -1)), JSON.stringify("abc".split("", 0)));
})();

//  ---- 并自 115-string-split-limit-zero.ts ----
(() => {
console.log(JSON.stringify("a,b,c".split(",", -1)));
console.log(JSON.stringify("a,b,c".split(",", 2)));
console.log(JSON.stringify("abc".split(undefined)));
console.log(JSON.stringify("".split("")));
console.log(JSON.stringify("a,b,".split(",")));
})();

//  ---- 并自 160-string-split-limit.ts ----
(() => {
console.log(JSON.stringify("a,b,c".split(",", 2)));
console.log(JSON.stringify("abc".split("")));
console.log(JSON.stringify("".split(",")));
console.log(JSON.stringify("a,,b".split(",")));
})();

//  ---- 并自 024-string-split-forms-root.ts ----
(() => {
console.log("a,b,,c".split(",").join("|"), "a,b,c".split(",", 2).join("|"));
console.log("abc".split("").join("-"), "abc".split().length, "".split(",").length);
console.log("a1b2c".split("1").join("+"));
})();

//  ---- 并自 010-string-split.ts ----
(() => {
console.log("a,b,,c".split(",").join("|"));
console.log("abc".split("").join("-"), "abc".split().length, "".split(",").length);
console.log("a-b-c".split("-", 2).join("|"), "abc".split("z").join("|"));
})();

//  ---- 并自 069-string-split-empty-and-limit.ts ----
(() => {
console.log(JSON.stringify("abc".split("")), JSON.stringify("a,b,c".split(",", 2)), JSON.stringify("".split(",")));
})();

//  ---- 并自 030-string-split-edge-forms.ts ----
(() => {
console.log("abc".split("").join("-"));
console.log("a,b,c".split(",", 2).join("|"));
console.log("".split(",").length, "".split("").length);
console.log("a,,b".split(",").map((s) => s.length).join(","));
console.log("aaa".split("aa").join("|"), "x".split("x").length);
})();

//  ---- 并自 128-string-split-limits.ts ----
(() => {
console.log(JSON.stringify("a,b,c".split(",", 2)));
console.log(JSON.stringify(",a,,b,".split(",")));
console.log(JSON.stringify("abc".split("")));
console.log(JSON.stringify("abc".split("", 0)));
console.log(JSON.stringify("no-sep".split(";")));
})();

//  ---- 并自 148-arg-string-split-limit.ts ----
(() => {
try { console.log("limit-2", String('a-b-c'.split('-', 2))); } catch (e) { console.log("limit-2", "ERR", String(e && e.name)); }
try { console.log("limit-0", String('a-b-c'.split('-', 0))); } catch (e) { console.log("limit-0", "ERR", String(e && e.name)); }
try { console.log("empty-sep", String('abc'.split(''))); } catch (e) { console.log("empty-sep", "ERR", String(e && e.name)); }
try { console.log("no-sep", String('abc'.split('-'))); } catch (e) { console.log("no-sep", "ERR", String(e && e.name)); }
})();

//  ---- 并自 117-string-split-captures-free.ts ----
(() => {
console.log("a,b,,".split(",").length, JSON.stringify("a,b,,".split(",")));
console.log(JSON.stringify("abc".split("")), JSON.stringify("abc".split("", 2)));
console.log(JSON.stringify("".split(",")), JSON.stringify("a b".split(" ")));
console.log(JSON.stringify("aaa".split("a")), "x".split("y").length);
})();

//  ---- 并自 103-string-split-join-roundtrip.ts ----
(() => {
const parts = "a,,b,".split(",");
console.log(JSON.stringify(parts), parts.join("|"), parts.length);
console.log(JSON.stringify("a b  c".split(" ")), JSON.stringify("a b  c".split(" ", 2)));
console.log("a,b".split(",", 0).length, "abc".split("", 2).join("-"));
})();

//  ---- 并自 084-string-split-and-join-roundtrip.ts ----
(() => {
const text = "a,b,,c";
console.log(JSON.stringify(text.split(",")));
console.log(text.split(",").join("|"));
console.log("  padded  ".trim().split(" ").join("-"));
console.log("a-b-c".split("-", 2).join("+"));
})();
