// xl:note 可选链的**基名是一条成员 / 下标链**时后面接 `as` / `satisfies`：断言折在整条链外面
// （第 1213 轮，用户口径 1.1：链那一支折到 `?.` 那一格之后把尾巴上的 `As` 递给 `foldBinaryFrom`，
//   而它找不到运算符就原样返回左操作数 ⇒ 整条 `as T` 丢掉；`a?.b as T` 那种「基名是光秃秃一个
//   标识符」的形状第 664 轮就由 `asAfterNco` 让开了，漏的是基名已经成链的这一族。）
// xl:expect As,Satisfies,NullConditionalOperator
a.b?.b as T;
a["b"]?.b as T;
a.b?.[c] as T;
a.b?.b() as T;
a.b?.b!.c as T;
a.b?.b satisfies T;
a.b?.b as T as U;
