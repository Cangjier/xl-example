// xl:note 泛型接口类型参数带逆变/双变修饰符 <in T> / <in out T>
// xl:expect Interface,InterfaceBody,GenericType
interface Consumer<in T> {
  use(x: T): void
}
interface Both<in out T> {
  value: T
}
