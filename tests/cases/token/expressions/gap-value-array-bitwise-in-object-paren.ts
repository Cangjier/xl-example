// xl:note 第 686 轮**还开着的那一格**：对象字面量值位里**被括号包住的数组**——
//   `f({ z: [3 & 4] })`（实参里的对象）、`const b = ({ w: [5 | 6] });`（括号化对象）
// 根因与同轮已修的那几格同一个（判据落到「前一个实义单元是 `:`」那条老路上）。
// 这两格上招待 `IsTypeBracketPosition` 时，`EnclosingBraceContext` 给的还是空串
// （它跳过 `Context` 为空的那个外层 `{`，而那一刻外层 `{` 的 `Context` 还没算出来），
// 于是照旧判类型位。要收它得让「包着我的那个 `{` 处在哪一位」在这两格上**当场**答得出来。
// xl:known-gap 实参里的对象 / 括号化对象里，外层 `{` 的 `Context` 在招待那一格时还是空串，
// `EnclosingBraceContext` 因此给不出答案，宿主槽位也还不是 `ObjectLiteral`。
// xl:expect UnionType,IntersectionType
const b = ({ w: [5 | 6] });
f({ z: [3 & 4] });
