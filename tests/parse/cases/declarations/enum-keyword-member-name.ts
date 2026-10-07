// xl:expect Enum,EnumMember,Identifier
// xl:note 枚举成员名是普通标识符：这些词都在关键字表里，但在 enum 成员里不升级
//        （升了之后投影把成员名投成 ReadonlyKeyword / AsyncKeyword 那几类）
enum E {
  readonly = 1,
  async = 2,
  keyof = 3,
  static = 4,
}
