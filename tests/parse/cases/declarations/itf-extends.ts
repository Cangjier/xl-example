// xl:expect Interface,InterfaceBody
// xl:note 基线用例（来自缺口审计语料）
interface I<T> extends A, B<T> {
  m(): T
}
