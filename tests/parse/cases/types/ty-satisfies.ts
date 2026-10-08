// xl:note 基线用例（来自缺口审计语料）
// xl:expect Satisfies,ArrayType,ObjectLiteral,ArrayLiteral
const x = { a: 1 } satisfies Record<string, number>
const y = [1, 2] satisfies number[]
