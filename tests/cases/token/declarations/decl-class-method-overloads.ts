// xl:note 类的方法重载：两个签名 + 一个实现
// xl:expect Class,ClassBody,MethodDeclaration,MethodBody
class C {
  m(x: string): string
  m(x: number): number
  m(x: any): any {
    return x
  }
}
