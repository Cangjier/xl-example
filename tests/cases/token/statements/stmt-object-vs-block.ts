// xl:note 语句位置的 `{ a: 1 }`：块语句里一个带标签语句，不是对象字面量
// **合并**（第 784 轮）：token/ambiguous/am-object-vs-block.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
{
  a: 1
}
