// xl:note 可选方法签名 `m?(): void` / `n?<T>(x: T): T`：应当成接口成员，不能被 `?` 拐成三元表达式（故同时钉 absent）
// xl:expect Interface,InterfaceBody
// xl:absent TernaryOperator
// **合并**（第 784 轮）：token/ambiguous/am-definite-method.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
interface I {
  m?(): void
  n?<T>(x: T): T
}
