// xl:note 类字段初始化器里的 `new X(...)`：构造器名不能被方法声明规则抢走
//（MethodDeclarationReorganization 排在 NewReorganization 之前，
//  而成员签名的判据只看「名字的父单元是不是成员体」——字段初始化式里的名字也在成员体里，
//  于是 `new C("x")` 里的 `C("x")` 被收成 MethodDeclaration，`new` 再也没法凑成 New 节点）
// xl:expect New,NewType,NewArguments,Field
// xl:expect Method:0
class Source {
  public static readonly Nil: Source = new Source("nil");
  public static readonly One: Source = new Source("one");
}
