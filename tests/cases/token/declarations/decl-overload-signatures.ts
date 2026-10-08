// xl:note 类与接口里的重载签名：无体的连续签名、以及「签名 + 带体实现」
//（接口里一行一条是常态；类里 2 条无体签名也各出一个 MethodDeclaration）
// xl:expect MethodDeclaration:4,Class,Interface
class A {
  f(a: string): void
  f(a: number): void
}
interface B {
  f(a: string): void
  f(a: number): void
}
