// xl:expect Enum,EnumBody
// xl:note 基线用例（来自缺口审计语料）
enum E {
  A = 1,
  B = 2,
  C = A | B,
}
