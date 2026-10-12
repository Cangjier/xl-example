// xl:note with 语句：with 是关键字，体里是普通语句
// **合并**（第 784 轮）：token/statements/st-with.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
with (obj) {
  a = 1
}
