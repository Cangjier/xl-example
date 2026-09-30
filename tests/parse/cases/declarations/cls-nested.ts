// xl:expect Class
// xl:note 基线用例（来自缺口审计语料）
class Outer {
  m() {
    class Inner {}
    return Inner
  }
}
