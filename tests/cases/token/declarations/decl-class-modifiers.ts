// xl:note 成员修饰符 public/private/protected/static/readonly 的各种组合
// xl:expect Class,ClassBody
class C {
  public a = 1
  private b = 2
  protected static readonly c: number = 3
  static d = 4
  readonly e = 5
}
