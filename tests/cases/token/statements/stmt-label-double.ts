// xl:note 双标签叠加在同一个 for 上：两个 Label 都成形，循环那一格是 For/ForBody
// **合并**（第 784 轮）：token/statements/st-label-nested.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
a: b: for (;;) {
  continue a
}
