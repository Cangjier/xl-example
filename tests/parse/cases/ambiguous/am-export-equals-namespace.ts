// xl:note 基线用例（来自缺口审计语料）
// xl:expect Namespace,NamespaceBody
declare namespace A {
  namespace B {
    const x: number
  }
}
export as namespace A
export = A
