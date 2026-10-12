// xl:expect Class
// xl:note 基线用例（来自缺口审计语料）
class A extends B {
  constructor() {
    super()
    if (new.target === A) {
    }
  }
  m() {
    return super.m()
  }
}
