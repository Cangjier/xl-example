// xl:note 第 1243 轮的守卫用例（口径 1.1）：**`if` / `else` 的体区间只有一份答案——
// `IfBody` 自己**，体里面那个裸块不许把它顶掉。
//
// 这一份钉的是第 1241 轮登记、第 1243 轮收掉的那一族：`IfSegment.CaptureBodyBrace` 原来先在
// `IfBody.Data` 里找一格 `{` 的 `Bracket`（那是体**里面**的块）⇒ `if (a) { { g() } }` 的外层体
// 被投影写成内层括号那一格、整个 `IfStatement` 少一格。
//
// 三组一起钉：① 体里那个裸块的五档内容（空块 / 调用 / `let` / 标签 / `break`）与「块后面还有语句」
// 「三层嵌套」「`else` 那一侧」「体内还有一层 `if`」；② 对照哨兵——别的体宿主里套同样的裸块
// **一直是好的**（`while` / `for` / 函数 / 方法 / 箭头 / 顶层 / `static` 块）；③ 值位花括号
// （`f({ a: 1 })`）不许被读成块。
// xl:round 1243
// xl:end
declare const a: any, b: any, g: any;

if (a) { { g() } }
if (a) { { } }
if (a) { { let y = 1; } }
if (a) { { b: 1 } }
if (a) { { break; } }
if (a) { { g() } b() }
if (a) { b(); { g() } }
if (a) { { { b: 1 } } }
if (a) { } else { { b: 1 } }
if (a) { if (b) { { g() } } }
while (a) { { g() } }
for (;;) { { g() } }
function f() { { g() } }
class C { m() { { g() } } }
const h = () => { { g() } };
{ { g() } }
class D { static { { g() } } }
if (a) { f({ k: 1 }) }
if (a) { } else { }
