// xl:expect Interface,InterfaceBody
// xl:absent TernaryOperator
// xl:note 可选方法签名 `m?(): void` / `n?<T>(x: T): T`：应当成接口成员，
// 不能被 `?` 拐成三元表达式（这是审计里发现的错位，故同时钉 absent）
interface I {
  m?(): void
  n?<T>(x: T): T
}
