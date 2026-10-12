// xl:note `as const` 里的 const 是字面量类型、不是声明头；换行后是另一条声明
// **合并**（第 784 轮）：token/declarations/vars-as-const.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
const a = [1, 2] as const
const o = { x: 1 } as const
