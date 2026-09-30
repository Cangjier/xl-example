// xl:note 联合类型在 `as` 后面折行：软换行不该漏进 `As` 的产物
// xl:expect Let,As,Common,Symbol
// xl:absent WrapSymbol
// `As` 是独立单元、没有自己的重组队列（`IndependentToken` 不装队列），
// 收进去的换行没人摘，会以 `<WrapSymbol />` 的形式直接漏进 XML。
const v = x as A |
  B;
