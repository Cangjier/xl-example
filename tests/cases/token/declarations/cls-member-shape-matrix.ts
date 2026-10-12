// xl:expect Class,MethodDeclaration,Field,ReturnType
// xl:note 声明形状矩阵：类成员的七种 MethodDeclaration 形态 + 存取器 + 字段 + 四种构造器
declare class ShapeHost {
  constructor();
  private constructor();
  constructor(a: number);
  private constructor(a: number);
  public m1(a: number): void;
  public m2<T>(a: T): T;
  m3?<T>(a: T): T;
  m4?(a: number): void;
  m5<T>(a: T): T;
  public p;
  public q?: number;
}
class BodyHost {
  public *gen(): Iterable<number> { yield 1 }
  public m6(a: number): void {}
  public get x(): number { return 1 }
  public set x(v: number) {}
}
