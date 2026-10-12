// xl:note 类型标注之后的换行是语句边界：`let a!: number` 与 `class C {}` 各出一条语句，`!` 那格是 TypeDefine
// **合并**（第 784 轮）：token/declarations/vars-definite.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
let a!: number
class C { x!: number }
