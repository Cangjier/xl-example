// xl:note `as` 后面的联合类型折行、且以 `|` 开头
// xl:expect Let,As,Identifier,SymbolToken
// xl:absent LineWrap
// 两件事一起测：开头那个软换行不许当成语句边界（否则 `As` 为空、抛裸 `TypeError`），
// 折行的软换行也不许漏进产物——`As` 是独立单元、没有自己的重组队列，没人替它摘换行。
const v = x as
  | A
  | B;
