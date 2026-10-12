// xl:note satisfies 运算符带复杂类型：运算符本身就收成一个 Satisfies 节点，类型实参段照常成形
// xl:expect Satisfies,GenericType,ObjectLiteral
const x = { a: 1 } satisfies Record<string, number>
