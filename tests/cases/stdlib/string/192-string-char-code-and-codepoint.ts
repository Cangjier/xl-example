// xl:title 码元与码点：`charAt` / `charCodeAt` / `codePointAt` / `at` / 下标读
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十九条**：
//   probe-s13 · probe-s26 · probe3-y17 · probe3-y18 · probe693-y14 · probe693-y15 ·
//   probe693-y16 · probe693-y17 · probe693-y18 · probe694-y20 · probe695-y14 ·
//   probe695-y19 · probe696-s13 · probe696-s14 · probe699-s-e02 · probe699-s-e03 ·
//   probe699-s-e04 · probe699-s-e05 · probe699-s-e06 · probe699-s-e07 · probe699-s-e45 ·
//   probe699-s-e46 · probe699-s-e37 · probe703-s-e24 · probe703-s-e25 · probe704-s-e06 ·
//   probe703-s-e26（长度那一面）· probe704-s-e24 · probe704-s-e25 · probe705-s-g06
// 判定点只有一个：**两把尺子**——
//  ① **码元**：`charAt` / `charCodeAt` / 下标读按 UTF-16 码元数，越界给 `""` / `NaN` / `undefined`；
//  ② **码点**：`codePointAt` / `at` / 迭代器按码位走，代理对算**一个**。
// 两者在代理对（`"\u{1f600}"` / `"😀"`）上给出不同的答案，所以必须在同一条里对照着钉。
// **第 812 轮又并进 4 条**（正文见下面各块；来源已下盘）：
//   058-string-codepoint-iteration-r297 · 102-string-iterator-codepoints-r371 ·
//   140-string-codepoint-iteration-r676 · exec/round708/046-string-surrogate-pairs。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const s: any = "abc";

try {
  // ① 码元那一族：越界与负下标
  console.log(show("abc".charAt(-1)));
  console.log(show("abc".charAt(5)));
  console.log(show("abc".charAt(9)));
  console.log(show("abc".charCodeAt(1)));
  console.log(show("abc".charCodeAt(0)));
  console.log(show("abc".charCodeAt(5)));
  console.log(show(String("abc".charCodeAt(9))));
  console.log(show("a".charCodeAt(0)));
  console.log(show("abc"[1]));
  console.log(show("abc"[5]));
  console.log(show(s[-1]));
  // ② 码点那一族
  console.log(show("abc".codePointAt(0)));
  console.log(show("abc".at(1)));
  console.log(show("abc".at(-1)));
  console.log(show("abc".at(5)));
  console.log(show("abc".at(-4)));
  console.log(show("abc".at(-5)));
  console.log(show("abc".charAt(-1)));
  // ③ 代理对：同一件事在两把尺子上的差别
  console.log(show("😀".length));
  console.log(show("\u{1f600}".length));
  console.log(show([..."😀"].length));
  console.log(show("😀".codePointAt(0)));
  console.log(show("é".length));
  console.log(show("\n".length + "\t".length));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

// ===== 第 812 轮并入：3 条同判定点来源（正文逐字照搬） =====

// ---- 并自 058-string-codepoint-iteration-r297.ts ----
(() => {
const s = "a\u{1F600}b";
const seen: string[] = [];
for (const c of s) seen.push(c);
console.log(s.length, [...s].length, Array.from(s).length, seen.length, seen[1].length);
const [x, y] = "a\u{1F600}";
console.log(x, y.length, [..."\uDC00\uD800"].length);
console.log(JSON.stringify([..."\uD800"]), JSON.stringify("\uD83D\uDE00"));
})();

// ---- 并自 102-string-iterator-codepoints-r371.ts ----
(() => {
const s = "a\u{1F600}b";
console.log(s.length, [...s].length, Array.from(s).length);
console.log([...s].map((c) => c.length).join(","));
for (const ch of s) console.log("ch", ch.length);
console.log(s[1], s[2], s.slice(1, 3).length);
})();

// ---- 并自 140-string-codepoint-iteration-r676.ts ----
(() => {
const s = "a\u{1F600}b";
console.log(s.length, [...s].length, s.codePointAt(1) === s.codePointAt(2));
console.log(String.fromCodePoint(97, 0x1f600), [...s].map((c) => c.codePointAt(0)!.toString(16)).join(","));
})();

// ===== 第 812 轮并入：1 条同判定点来源（正文逐字照搬） =====

// ---- 并自 C:\Users\Admin\Documents\GitHub\xl-example\tmp\x812b-src\046-string-surrogate-pairs.ts ----
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const s = "\u{1F600}";
console.log(show(s.length) + "," + show([...s].length) + "," + show(s.codePointAt(0)));
})();
