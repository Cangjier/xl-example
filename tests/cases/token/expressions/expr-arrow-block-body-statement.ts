// xl:note 箭头函数的块体是语句块：`return a` 是语句，不能退化成 Field
// **合并**（第 784 轮）：token/declarations/fn-arrow-block.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
const f = (a) => {
  return a
}
