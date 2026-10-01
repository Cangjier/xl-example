// xl:note 前导 `|` 的联合：`type X =` 换行 `| A` 换行 `| B`，整段仍是一个 UnionType
// xl:expect UnionType,Identifier:2
type X =
  | A
  | B
