// xl:expect Class
// xl:note 基线用例（来自缺口审计语料）
class A {
  #x = 1
  static #y = 2
  #m() {
    return this.#x
  }
  static #s() {}
}
