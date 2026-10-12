// xl:title `replace` 的替换文本：`$&` / `` $` `` / `$'` / `$$` 与不合法的记号
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的八条**（第 692 轮那一次并组）：
//   probe699-s-t03 · probe699-s-t04 · probe699-s-t05 · probe700-g-t01 · probe700-g-t02
//   ＋ 原有的 `041-string-replace-dollar-forms`（同一件事的第一份，已经算在这一族里）
// **第 812 轮又并进 6 条**（它们自称并过、文件却一直留在盘上，正文见下面各块；来源已下盘）：
//   041-string-replace-dollar-forms · 124-string-replace-dollar-and-function ·
//   150-arg-string-replace-patterns · 156-string-replace-groups ·
//   159-string-replace-patterns · 185-string-replace-template
// 判定点只有一个：**替换文本里 `$` 那一族的展开表**——
//  ① 认得的四格：`$&`（整个匹配）、`` $` ``（匹配之前的）、`$'`（匹配之后的）、`$$`（一个字面 `$`）；
//  ② **没有捕获组**时 `$1` / `$<x>` 不被认出来，**原样留下**（不是空串、也不抛）；
//  ③ `$x` / 结尾孤立的 `$` 同样原样留下；`$&` 打头的串（`$&$&`）重复一次匹配到的字符。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show("abc".replace("b", "$1")));
  console.log(show("abc".replace("b", "$<x>")));
  console.log(show("abc".replace("b", "$x")));
  console.log(show("abc".replace("b", "$")));
  console.log(show("abc".replace("b", "[$&]")));
  console.log(show("abc".replace("b", "[$`]")));
  console.log(show("abc".replace("b", "[$']")));
  console.log(show("abc".replace("b", "[$$]")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

// ===== 第 812 轮并入：6 条同判定点来源（正文逐字照搬） =====

// ---- 并自 041-string-replace-dollar-forms.ts ----
(() => {
console.log("abc".replace("b", "[$&]"));
console.log("abc".replace("b", "[$']"));
console.log("abc".replace("b", "$1"), "abc".replace("b", "$$"));
})();

// ---- 并自 124-string-replace-dollar-and-function.ts ----
(() => {
console.log("a-b-c".replace("-", "[$&]"));
console.log("a-b-c".replaceAll("-", "<$'>"));
console.log("x1y2".replace("1", () => "$&literal"));
console.log("abc".replace("b", (m, i) => i + ":" + m));
console.log("aaa".split("a").length, "aaa".split("").join("|"));
})();

// ---- 并自 150-arg-string-replace-patterns.ts ----
(() => {
try { console.log("amp", String('abc'.replace('b', '[$&]'))); } catch (e) { console.log("amp", "ERR", String(e && e.name)); }
try { console.log("dollar", String('a$b'.replace('$', '$$'))); } catch (e) { console.log("dollar", "ERR", String(e && e.name)); }
try { console.log("prefix", String('abc'.replace('b', '<$`>'))); } catch (e) { console.log("prefix", "ERR", String(e && e.name)); }
try { console.log("suffix", String('abc'.replace('b', "<$'>"))); } catch (e) { console.log("suffix", "ERR", String(e && e.name)); }
try { console.log("fn", String('abc'.replace('b', (m: any) => m.toUpperCase()))); } catch (e) { console.log("fn", "ERR", String(e && e.name)); }
try { console.log("replaceAll", String('aXbXc'.replaceAll('X', '-'))); } catch (e) { console.log("replaceAll", "ERR", String(e && e.name)); }
})();

// ---- 并自 156-string-replace-groups.ts ----
(() => {
try { console.log("no-group-numeric", String('abc'.replace('b', '[$1]'))); } catch (e) { console.log("no-group-numeric", "ERR", String(e && e.name)); }
try { console.log("amp", String('abc'.replace('b', '<$&>'))); } catch (e) { console.log("amp", "ERR", String(e && e.name)); }
try { console.log("dollar", String('a$b'.replace('$', '$$'))); } catch (e) { console.log("dollar", "ERR", String(e && e.name)); }
try { console.log("backtick", String('abc'.replace('b', '[$`]'))); } catch (e) { console.log("backtick", "ERR", String(e && e.name)); }
try { console.log("quote", String('abc'.replace('b', "[$']"))); } catch (e) { console.log("quote", "ERR", String(e && e.name)); }
try { console.log("all", String('a-b-c'.replaceAll('-', '+'))); } catch (e) { console.log("all", "ERR", String(e && e.name)); }
})();

// ---- 并自 159-string-replace-patterns.ts ----
(() => {
console.log("abc".replace("b", "[$&]"));
console.log("abc".replace("b", "$'"));
console.log("abc".replace("b", (_m: any, ...rest: any[]) => m0(rest)));
function m0(rest: any[]): string { return "[" + rest.join("|") + "]"; }
console.log("a-b".split("-", 1).join(","));
})();

// ---- 并自 185-string-replace-template.ts ----
(() => {
// **合并了原先同一个判定点的九条原子探针**（同一个 `$` 解释被第 693 / 695 两轮各抄了一遍）：
//   probe693-y02 · probe693-y03 · probe693-y04 · probe693-y05
//   probe695-y01 · probe695-y02 · probe695-y03 · probe695-y04 · probe695-y05
// 判定点只有一个：**替换模板里 `$` 开头的那几串各自的含义**——
//   `$&` 匹配到的子串 · `` $` `` 匹配**之前**那一段 · `$'` 匹配**之后**那一段 ·
//   `$$` 一个字面量 `$`；且**空匹配**（`replace("", x)`）在前缀位置插入一次。
// 与 `replace` 的**函数形式**（回调拿到的实参表）不是同一个判定点——
// 那一件另有归属（`164-string-replace-function` 与 `probe694-y01`）。
//
// `probe693-y02` 的靶子是 `"aXbXc"`、`probe695-y01` 是 `"abc"`：两边的**期望值不同**但
// **问的是同一件事**（`$&$&` 把匹配到的字符重复一次），所以合到这里、两条都写。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // `$&`：整段匹配重复一次（两个靶子都写，好把"只看第一个匹配"这一层也钉住）
  console.log(show("aXbXc".replace("X", "$&$&")));
  console.log(show("abc".replace("b", "$&$&")));
  // `` $` ``：匹配**之前**那一段
  console.log(show("aXb".replace("X", "$`")));
  console.log(show("abc".replace("b", "$`")));
  // `$'`：匹配**之后**那一段
  console.log(show("aXb".replace("X", "$'")));
  console.log(show("abc".replace("b", "$'")));
  // `$$`：一个字面量 `$`
  console.log(show("abc".replace("b", "$$")));
  // 空匹配：在**开头**插一次（不是每个位置都插）
  console.log(show("abc".replace("", "-")));
  console.log(show("abc".replace("", "x")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
})();
