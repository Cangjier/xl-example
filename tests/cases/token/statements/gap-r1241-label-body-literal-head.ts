// xl:note 第 1241 轮**新登记**、第 1242 轮**转绿**的一格（用户口径 1.1）：
// **标签体以「不是 `Identifier` 的那个单元」开头**时，标签收不出来。
// `xl:known-gap` 按规矩撤掉，用例留着当守卫。
//
// 缺口原来是：`b: 'x'` / `b: (x)` / `b: [1]` / `b: -1` / `` b: `x` `` 在 TS 里都是
// `LabeledStatement(b)` 套一条表达式语句，产物那一列是**缺 3~4 多 1**
//（缺 `LabeledStatement` + 那条表达式语句 + 里面的节点，多一个把整段装走的 `ExpressionStatement`）。
//
// **与体无关**（第 1241 轮逐体量过一遍）：`if` 的体 / `else` 的体 / `while` 的体 / 函数体 /
// 方法体 / 箭头体 / 顶层裸块 / 顶层，**七个宿主一样坏**；带不带分号也一样坏。
//
// **根因（第 1242 轮量到底、当轮转绿）**：`label.xl.md` 的 `LabelCloseRule.StatementStartsHere`
// 最后那句 `if (!(item instanceof Identifier)) return false;` —— 数字 / 布尔字面量能过是因为
// 它们在词法层就是 `Identifier` 实例，而 `String` / `(` / `[` / 一元前缀**是别的 token 类**。
// 补上三档（字符串与 `ConstString` 按类名认、`(` / `[` 括号、`!` `-` `+` `~` `++` `--`
// 六个一元前缀）之后：`tmp/r1242-probe.mjs` 30 条里 **8 条对不上 → 0 条**，
// 而同一片里那 22 条对照档（三元 / 变量类型标注 / 对象字面量属性 / 接口与类成员 /
// 形参类型 / `case` 段 / 嵌套三元 / `lbl: new C()` / `lbl: typeof x`）**一条没动**。
// xl:round 1241
// xl:end
declare const a: any, b: any, x: any;

if (a) { } else { b: 'x' }
if (a) { } else { b: (x) }
if (a) { } else { b: [1] }
if (a) { } else { b: -1 }
