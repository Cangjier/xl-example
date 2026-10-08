// xl:expect Class,Interface,MethodDeclaration,MethodBody,TypeOperator,ArrayType,ParenthesizedType,UnionType
// xl:absent TernaryOperator
// xl:note `readonly` 既是类型运算符又是合法的成员名：分界看名字前面那一格
//        （`readonly() {}` 前面是成员起始或修饰词 ⇒ 名字；`references?: readonly (A | B)[]` 前面是 `?` / `:` ⇒ 类型运算符）
class A {
  readonly() {}
  static readonly() {}
  async readonly() {}
  get readonly(): number {
    return 1;
  }
}
interface I {
  references?: readonly (number | undefined)[];
}
