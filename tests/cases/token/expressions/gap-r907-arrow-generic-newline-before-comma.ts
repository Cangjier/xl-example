// xl:note 箭头函数的泛型参数表：`<T` 与 `,>` 之间换行（第 907 轮片段普查量出）：TS 那边整条是一条 `ArrowFunction`，产物把 `<` 折成 `LessThanToken`、`(a: T) => a` 落进另一条语句（缺 `ArrowFunction` / `TypeParameter` / `Identifier`）
// xl:round 907
// 第 914 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：**内容闸的换行那一格少了一档**——
// `ScanArguments` 跨换行只认「上一个实义字符是 `,` / `<` / `|` / `&`」「下一个实义字符是 `>` / `|` / `&` / `:` / `?`」
// 「宿主停在声明头的名字上」「嵌套未归零」四档，而这里上一个实义字符是 `T`、下一个是 `,` ⇒ 判否 ⇒
// 整个 `<…>` 退回裸符号。补的那一档是 **`IsOperandStartUnit(unit)`：`<` 前面按定义还没有左操作数**——
// 那个位置上比较式根本写不出来，`<…>` 只可能是类型参数表 / 断言类型，段里的换行没有「这条语句到此为止」那种读法。
// 位置闸与名字闸原本就共用这一句（第 66 / 379 轮），这一轮只是把同一句话接到换行那一格上，
// 不是把比较式那一侧的判据放宽（`a < b` 换行 `, c > (d)` 的 `<` 前面是 `a`，这一支不响）。
// 一条根收掉四格（都在 `--snippets` 探针里量过）：`const f = <T` 换行 `,>(a: T) => a`、
// 多参的 `, U>`、类型位的 `type X = <T` 换行 `,>(a: T) => T`、语句开头的 `<T` 换行 `,>(a: T) => a`。
// **同一族的另一半在第 915 轮收掉**：`<` 前面**有**名字时（`f<T` 换行 `,U>(x)` / `Map<T` 换行 `,U>`）
// 走的是另一格——`NextSignificantContinuesArguments` 补上了 `,` 那一档，
// 用例在 `expr-generic-call-newline-before-comma` / `expr-comparison-newline-before-comma` /
// `type-arguments-newline-before-comma`。
// xl:end
const f = <T
,>(a: T) => a;
