// xl:note 构造函数参数属性的修饰符组合：public readonly / private readonly / protected / 只 readonly
// xl:expect Class,ClassBody,Method,MethodBody
class C {
  constructor(
    public readonly a: number,
    private readonly b: string,
    protected c: boolean,
    readonly d: number,
  ) {}
}
