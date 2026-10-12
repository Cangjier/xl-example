// xl:note 成员修饰符的换序写法（abstract 前置/后置、static 与 readonly、declare 与 static）
// xl:expect Class,ClassBody
abstract class C {
  abstract a: number
  public abstract b(): void
  static readonly c = 1
  declare static d: number
}
