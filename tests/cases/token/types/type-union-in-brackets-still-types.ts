// xl:note 上一条的**反向**（第 686 轮）：值位那一半修好之后，**类型位**那一半一个都不能少——
// 元组类型、对象类型的值位、泛型实参里的元组，三处都要照旧收成 `UnionType` / `IntersectionType`。
// 判据是 `Bracket.Context` 只在 `"value"` 时改答案（`"type"` 与 `""` 照旧走前文判据）。
// xl:expect UnionType:3,IntersectionType,TupleType:2
// xl:absent BinaryOperator,ArrayLiteral
type T1 = [A | B];
type T2 = { k: A | B };
type T3 = Foo<[A & B, C | D]>;
