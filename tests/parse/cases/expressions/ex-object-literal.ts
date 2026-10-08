// xl:note 基线用例（来自缺口审计语料）
// xl:expect Spread,MethodBody,ObjectLiteral,ArrayLiteral
const o = {
  a,
  b: 1,
  [k]: 2,
  m() {},
  get x() {
    return 1
  },
  set x(v) {},
  async am() {},
  *gm() {},
  "s": 1,
  1: 2,
  ...rest,
}
