// xl:note 第 945 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 导入声明的**属性子句另起一行**时它不成形——`import a from "m"` 换行
// `with { type: "json" };` 在 TS 那边是**一条** `ImportDeclaration`
//（`with` 那个子句是 `assertClause`，`ImportDeclaration.assertClause`），
// 而本仓把 `with { … }` 收成另一条 `WithStatement`：
// 缺 `AssertClause` / `AssertEntry` / `StringLiteral(值)` 共 3、漂 1、多 4。
// 根因（第 941 轮插桩）在**收壳那一刻**：`Statement.IsPendingImportHead` 一看到
// `String`（路径）就答「写完了」⇒ 换行处收壳 ⇒ `with { … }` 落进另一条 `Statement`
// ——`ImportCloseRule.Process` 那两条判据（换行还没进 `units`）再对也够不着。
// 第 945 轮的修法：在「路径已经到手」那一支里再问一次 `NextLineOpensAttributes`
// （判据本体还是第 941 轮那一份，从**末了那个实义单元的 `End`** 起扫）⇒ 有属性子句
// 就不收壳。**收尾期那一半不用改**（实测：`IsLineBreakBoundary` 一处未动即转绿，
// 因为壳没关、`IsStatementEnd` 的「换行后面是 `;`」那条本来就不把它算成语句末）。
// `with` 只留成 `Import` 里的 `Identifier`（子句由 `ReadClause` 读），产物里不再有裸 `Keyword`。
// xl:expect Import,Identifier,String
import a from "m"
with { type: "json" };
import b from "m" //c
with { type: "json" };
import c from "m"
with {
type: "json" };
