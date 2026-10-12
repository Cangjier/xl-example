// xl:note global augmentation block：declare global 里那个 interface 是 Namespace/NamespaceBody 之外还要成形的一格
// **合并**（第 784 轮）：token/modules/ns-declare-global.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
declare global {
  interface Window {
    x: number
  }
}
