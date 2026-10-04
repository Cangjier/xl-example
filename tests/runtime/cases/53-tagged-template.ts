// 第 171 轮：**标签模板** `` tag`a${x}b` ``。
//
// JS 把它变成**一次普通调用**：`tag(parts, x)`，其中 `parts` 是**段落数组**（`["a", "b"]`）。
// 原来降级期报 `unimplemented: expression TaggedTemplateExpression` —— **整份文件进不来** ——
// 而 `` sql`…` `` / `` styled.div`…` `` / `` gql`…` `` 这些写法在真实 `.ts` 里很常见。
//
// 段落取自投影给的那套 TS 形状：`TemplateExpression` 的 Data 是 `[TemplateHead, TemplateSpan…]`，
// 每个 `TemplateSpan` 是 `[TemplateMiddle|TemplateTail, expression]`；没有内插时整个模板
// 就是一个 `NoSubstitutionTemplateLiteral`。
//
// **两档还没做**（都记在台账里）：
//   · 段落数组上的 `raw` 属性（这一层还没有「挂属性」那条路）→ `` String.raw`…` `` 仍不对；
//   · 「同一个调用点共用一个段落数组」那条身份约定 → 这里每次求值新建一个。

function tag(parts: any, ...values: any[]): string {
  return parts.join("|") + "#" + values.join(",") + "(" + parts.length + ")";
}

const b = 1;
const c = 2;

// ① 有内插 / 无内插 / 空模板
console.log(tag`a${b}c`);
console.log(tag`plain`);
console.log(tag``);

// ② 连续内插、开头结尾都是内插
console.log(tag`${b}${c}`);
console.log(tag`${b}middle${c}`);
console.log(tag`x${b}y${c}z`);

// ③ 表达式里（不是语句开头）
console.log([tag`a${b}`, tag`b${c}`].join(" / "));
// **「标签模板当属性访问的接收者」不在这份语料里** ✗：
// `tag`a${b}`.length` 与 `tag`a${b}` === tag`a${b}`` 本仓给的是**函数** ✗
//（Node 给 `7` / `true` ✓）——**静默错值** ✗。最小反例就是 `tag`a`.length` ✓；
// 形状与第 158–161 轮那一族相同 ✓（结果槽与水位的关系 ✓），记在台账里 ✓。

// ④ 箭头函数当 tag（真实库的常见写法）
const upper = (parts: any, ...v: any[]) => parts.join("!").toUpperCase() + v.join("");
console.log(upper`hi${b}there`);

// ⑤ 段落里带转义与多行
console.log(tag`line1\nline2`);
console.log(tag`tab\there`);

// ⑥ 内插里是复杂表达式
console.log(tag`sum=${b + c}`, (tag`nested${tag`in${b}`}`).length > 0);

// ⑦ 类型位照旧（模板字面量类型不该被当成调用）
type Greeting = `hello ${string}`;
type Plain = `fixed`;
const g: Greeting = "hello world";
const p: Plain = "fixed";
console.log(g.length, p.length);
