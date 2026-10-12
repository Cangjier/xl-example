// xl:title `String.raw`：标签模板的 `raw` 那一栏与 `{ raw: […] }` 那一档
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的八条**：
//   probe3-y04 · probe699-s-t02 · probe157-string-raw-r683 · probe164-template-raw-escape
//   ＋ `037-string-raw-and-tagged` / `074-string-raw-r323` / `098-string-raw-r371`（同一件事的三份）
//
// 判定点只有一个：**`String.raw` 取的是 `raw` 那一栏（转义不生效）**——
//  ① 标签模板：`` String.raw`a\nb` `` 给**两个字面字符** `\` 与 `n`，不是换行；
//  ② 普通调用那一档：`String.raw({ raw: ["x", "y"] }, 1)` 按替换位插值；
//  ③ 标签拿到的第一个实参上 `raw` 与 `0` 是两个不同的串（`\t` 那一格）；
//  ④ 插值个数与 `raw.length - 1` 对得上。
// **第 812 轮又并进 3 条**（正文见下面各块；来源已下盘）：
//   074-string-raw-r323 · 098-string-raw-r371 · 157-string-raw-r683。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const tag = (s: any, ...v: any[]): string => s.raw[0] + "|" + s[0] + "|" + v.length;

try {
  console.log(show(String.raw`a\nb`));
  console.log(show(String.raw({ raw: ["x", "y"] }, 1)));
  console.log(show(tag`a\tb${1}c`));
  console.log(show(String.raw`a\nb`.length));
  console.log(show(String.raw`a\nb` === "a\\nb"));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

// ===== 第 812 轮并入：3 条同判定点来源（正文逐字照搬） =====

// ---- 并自 074-string-raw-r323.ts ----
(() => {
const s = String.raw`a\nb`;
console.log(s, s.length);
console.log(String.raw`x${1 + 1}y\t`, String.raw({ raw: ["p", "q"] }, "-"));
})();

// ---- 并自 098-string-raw-r371.ts ----
(() => {
console.log(String.raw`a\nb`);
function tag(parts: TemplateStringsArray, ...vals: unknown[]) {
  console.log(parts.raw[0] === "x\\ny", parts.length, vals.join(","));
  return parts.join("|");
}
console.log(tag`x\ny${1}z${2}`);
})();

// ---- 并自 157-string-raw-r683.ts ----
(() => {
try { console.log("raw-basic", String(String.raw`a\nb`)); } catch (e) { console.log("raw-basic", "ERR", String(e && e.name)); }
try { console.log("raw-sub", String((() => { const x = 1; return String.raw`a\n${x}b`; })())); } catch (e) { console.log("raw-sub", "ERR", String(e && e.name)); }
try { console.log("raw-length", String((() => { const tag: any = (s: any, ...v: any[]) => String(s.raw.length) + ':' + v.length; return tag`a${1}b${2}c`; })())); } catch (e) { console.log("raw-length", "ERR", String(e && e.name)); }
try { console.log("cooked-vs-raw", String((() => { const tag: any = (s: any) => (s[0] === '\n') + ':' + (s.raw[0] === '\\n'); return tag`\n`; })())); } catch (e) { console.log("cooked-vs-raw", "ERR", String(e && e.name)); }
})();
