// xl:note 第 1241 轮**新登记**、第 1243 轮**转绿**的一格（用户口径 1.1）：
// **`if` / `else` 的花括号体里再套一个裸块**时，外层那个 `}` 不在任何单元的区间里。
// `xl:known-gap` 按规矩撤掉，用例留着当守卫。
//
// 缺口原来是：`if (a) { { g() } }` 在 TS 里是 `IfStatement` 套 `Block`（体）套 `Block`，
// 外层体 `[7,19)`；产物那一列**缺 0 漂 2 多 1** —— 里层块是对的，可外层 `Block` 与整个
// `IfStatement` 都停在**里层那个 `}` 之后**（`IfStatement [0,17)`、外层 `Block [9,17)`）。
//
// **根因（第 1243 轮量到底、当轮转绿）**：token 树本来是对的（`IfBody [7,17)`、
// 内层 `Bracket [9,15)`，见 `tmp/r1243-xml.mjs`），错在**段的 `BodyBrace`（投影直读的那一格）**——
// `IfSegment.CaptureBodyBrace` 先在 `IfBody.Data` 里 `find` 一个 `{` 的 `Bracket`，
// 而体的开括号由 `MountBody` 消费、闭括号由 `IfBody.ExitOrPre` 认，**两者都不进 `Data`**
// ⇒ `Data` 里那个 `{` 只可能是体**里面**的那个块 ⇒ 记下的是内层括号 `[9,15)`。
// 改成一律读 `IfBody` 自己的区间（空块那一档本来就走这一支）之后：
// `tmp/r1241-probe3.mjs` **11 → 0**、`tmp/r1241-probe2.mjs` **5 → 0**、
// `tmp/r1241-probe.mjs` **1 → 0** 条对不上。
//
// **与块里装什么无关**（第 1241 轮逐档量过）：空块 / 一条调用 / `let` 声明 / 标签 / `break`
// 五档一样坏；`while` / `for` / 函数 / 方法 / 箭头体 / 顶层裸块 / `StaticBlock` 里套同样的裸块
// **一直是好的**（它们不读这一格）。
// xl:round 1241
// xl:end
declare const a: any, g: any;

if (a) { { g() } }
if (a) { { } }
if (a) { { let y = 1; } }
