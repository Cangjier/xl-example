// xl:note 类里的 `constructor` 与普通方法在产物里同标签（MethodDeclaration），投影按**父 kind** 与 `name` 属性投成 `Constructor`
// xl:expect Class,ClassBody,MethodDeclaration:2
class A {
  constructor(x: number) {}
  m(): void {}
}
