// xl:note 对象字面量值位里**被括号包住的数组**：`f({ z: [3 & 4] })`（实参里的对象）、
//   `const b = ({ w: [5 | 6] });`（括号化对象）——第 686 轮登记、第 864 轮转绿。
// 第 864 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `BraceInExpression` 在这两格上答「不在表达式里」——那个 `{` 是父括号 `(` 的**第一个实义单元**，
// 它前面什么都没有，于是 `EnclosingBraceContext` 给空串、冒号被当成类型标注 ⇒
// `|` / `&` 折成 `UnionType` / `IntersectionType`（缺 4 多 6）。
// 现在那一档问 `{` 自己的 `Context`（开括号那一刻算的），值位与元组类型两种排版都实测过。
// xl:expect ArrayLiteral,ObjectLiteral,SymbolToken
const b = ({ w: [5 | 6] });
f({ z: [3 & 4] });
