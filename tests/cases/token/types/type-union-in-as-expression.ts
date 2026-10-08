// xl:note `as` 右边是类型文本：折行的联合在这里也要成形（`As` 挂类型队列）
// xl:expect As,UnionType
const value = input as
  | A
  | B
