// xl:expect Class,ClassBody,Field,MethodDeclaration
// xl:absent Keyword
// xl:note 修饰词顺序（export declare abstract class、private static readonly 字段、public abstract 方法）：
// 修饰词应折进 modifiers 属性，而不是各自落成一个 Keyword 节点；无体的 abstract 方法应成 MethodDeclaration。
// 返回类型特意写成 `number` 而不是 `void`——`void` 是类型位的关键词、本来就该是 Keyword，
// 写成它会让这条 `absent Keyword` 的意图（只针对修饰词）失效
export declare abstract class A {
  private static readonly b: number
  public abstract m(): number
}
