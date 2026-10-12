// xl:note 值位对照（第 67 轮）：括号类型的内容判据换成「父单元是 ParenthesizedType」之后，
// 值位实参里的括号与方括号**一个都不许变成类型**——`f(a, ([x]))` 里的 `[x]` 仍是数组字面量。
// xl:expect ArrayLiteral:2,ObjectLiteral
// xl:absent TupleType,ArrayType,IndexedAccessType,LiteralType,TypeOperator,TypeQuery,ParenthesizedType
declare function f(a: unknown, b: unknown): void;
const w1 = f(a, [1, 2]);
const w2 = f(a, ([x]));
const w3 = { a: 1 };
