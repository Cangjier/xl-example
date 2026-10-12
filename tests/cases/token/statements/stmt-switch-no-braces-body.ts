// xl:note case 里不写块：case 体本身就是一条条语句；比较括号与各分支段都要成形
// xl:expect Switch,SwitchCompare,SwitchSegment,SwitchCase,SwitchStatement
// **合并**（第 784 轮）：token/statements/stmt-switch-basic.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
switch (x) {
  case 1:
    f()
    break
  default:
    g()
}
