// xl:note 构造函数参数属性：public/private/protected/readonly 及组合
// xl:expect Class,ClassBody,MethodDeclaration,MethodBody
class C {
  constructor(
    public a: number,
    private readonly b: string,
    protected c?: boolean,
  ) {}
}
