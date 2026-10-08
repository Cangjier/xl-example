// xl:note 枚举的计算成员（含常量表达式位移）
// xl:expect Enum,EnumBody
enum E {
  A = 1 << 2,
  B = A | 8,
}
