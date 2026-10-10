// xl:known-gap 导入声明的**属性子句另起一行**时它不成形：`import a from "m"` 换行
// `with { type: "json" };` 在 TS 那边是**一条** `ImportDeclaration`
//（`with` 那个子句是 `assertClause`，`ImportDeclaration.assertClause`），
// 而本仓把 `with { … }` 收成另一条 `WithStatement`：
// 缺 `AssertClause` / `AssertEntry` / `StringLiteral(值)` 共 3、漂 1（`ImportDeclaration` 只到路径）、多 4。
// 根因是**触发时机**，不是判据：`ImportCloseRule` 的触发点是 `;`（换行由 appender 管），
// 而 `Process` 收到 `units` 的那一刻**换行还没进列表**（插桩实测：
// `n=4 units=[import, a, from, "m"]`）⇒ 第 941 轮加进 `Process` 的
// 「换行 + `NextLineOpensAttributes`」那一支**一次都不会响**。
// 同一轮试过把判据挪到 `Previous`（「让开，等属性子句到齐再接手」）：让开之后再没有哪一趟
// 碰到本规则，`import` 那个词直接留成裸 `Keyword`（实测从「缺 3」退到「缺 7」）——已撤。
// `with { … }` 与路径**写在同一行**时本来是对的（`importattrn1..n5` 一族全绿），
// 所以这一格只差「换行」这一种排版。用例守着这一族 10 条（`n6..n9` / `l6..l9` / `n15` / `n16`）。
// xl:expect Import,Keyword,Identifier,String
import a from "m"
with { type: "json" };
import b from "m" //c
with { type: "json" };
import c from "m"
with {
type: "json" };
