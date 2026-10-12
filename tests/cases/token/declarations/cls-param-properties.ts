// xl:expect Class
// xl:note 基线用例（来自缺口审计语料）
class A {
  constructor(public readonly a: number, private b = 1, protected c?: string) {}
}
