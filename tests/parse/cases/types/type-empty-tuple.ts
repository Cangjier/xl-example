// xl:note 空元组 `[]`（第 67 轮）：类型容器里的空方括号左边没有操作数时是**空元组**，
// 不是数组类型。`TypeBracketReorganization.Previous` 原来要求「空括号左边必须有操作数」，
// 于是空元组永远落成裸括号（真实语料 13 处，`next(...args: [] | [TNext])` 那种）。
// xl:expect TupleType:7,ArrayType:3
type E1 = [];
type E2 = A[];
type E3 = [...A[]];
type E4 = [[], A];
type E5 = { a: []; b: A[] };
declare function g(): Generator<number, void, [] | [number]>;
