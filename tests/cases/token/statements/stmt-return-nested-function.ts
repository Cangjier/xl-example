// xl:note 内层函数里的 return 属于内层函数体（嵌套函数声明的两条语句各归各家）
// **合并**（第 784 轮）：token/declarations/decl-func-nested.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
function outer() {
  function inner() {
    return 1
  }
  return inner()
}
