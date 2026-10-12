// xl:note `as` 与 `satisfies` 同级左结合：`a as B satisfies C` 是两个节点，不是一个
// xl:expect As,Satisfies,Identifier:3
// xl:absent Keyword
const x = a as const satisfies B
