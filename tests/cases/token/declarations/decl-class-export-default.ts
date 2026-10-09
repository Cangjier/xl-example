// xl:note export default class：默认导出的具名类仍要收成 Class + ClassBody
// **合并**（第 784 轮）：token/modules/mod-export-default-class-named.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
export default class C {
  m() {}
}
