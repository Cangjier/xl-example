// xl:note 类里的重载：无体签名后面跟着带体的实现时，前几条也必须各出一个 MethodDeclaration
//（ScanDeclarationBody 会跨换行找到**下一条签名的 `{`**；判据是「体括号前面紧邻的参数表
//  必须与当前签名的参数表原文一致」——同名同参的实现才算自己的体）
// xl:expect MethodDeclaration:5,Class:2
class A {
  f(a: string): void;
  f(a: number): void;
  f(a: any) {}
}
class B {
  get x(): String {
    return (this.Y as String)!;
  }
  m(): void {
    return (this.Z)!;
  }
}
