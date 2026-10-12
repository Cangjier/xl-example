// xl:note 对象字面量的**值位**数组里的位运算（第 686 轮，**实测撞到的**）：对象字面量里的 `:`
// 是**值的分隔符**，不是类型标注，可是 `IsTypeBracketPosition` 只看「前一个实义单元是 `:`」
// 就判类型位 ⇒ `|` / `&` 折成 `UnionType` / `IntersectionType`，降级层报
// `unimplemented: expression UnionType`（**整份文件进不来**）。
// 判据改用括号自己在开括号那一刻算好的 `Bracket.Context`（`"value"`）。
// xl:expect ArrayLiteral:2,ObjectLiteral:2
// xl:absent UnionType,IntersectionType,LiteralType
const o = { b: [1 | 2] };
const p = { c: [5 & 3] };
