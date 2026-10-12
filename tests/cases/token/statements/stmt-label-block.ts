// xl:note 块语句上的标签 `outer: { break outer }`：标签 + 块，块里是 `break` 语句
// **合并**（第 784 轮）：token/statements/st-label-block.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
outer: {
  break outer
}
