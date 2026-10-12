// xl:note 展开实参后面跟 `as`：产物里 `Spread` 与 `As` 是**平级两格**，`as` 是更松的那一层
// xl:expect Spread,As,ArrayLiteral,Method
// 投影要把这两个平级单元折成 `SpreadElement{ expression: AsExpression }`——
// 折反（`AsExpression{ expression: SpreadElement }`）不只是形状漂：降级层看那一格不是
// `SpreadElement`，整条实参**不展开**，那个数组被原样当成一个实参递进去（静默错值）。
f(...[1, 2] as any);
