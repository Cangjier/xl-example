// xl:note 可选属性 a? 与只读属性 readonly b（不能把 ? 解析成三元）
// xl:expect Interface,InterfaceBody,Field
// xl:absent TernaryOperator
interface I {
  a?: number
  readonly b: string
}
