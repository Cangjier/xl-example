// xl:note `as const` 里的 const 是字面量类型、不是声明头；换行后是另一条声明
// xl:expect Statement:2,As:2,Let:2
const a = [1, 2] as const
const o = { x: 1 } as const
