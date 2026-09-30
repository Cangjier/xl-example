// xl:note satisfies 运算符带复杂类型（satisfies 属于 Keyword 表；运算符本身无标签）
// xl:expect Keyword,GenericType
const x = { a: 1 } satisfies Record<string, number>
