// xl:note 字面量类型：字符串 / 数字 / 十六进制 / 布尔 / null / 带符号数字都收成 LiteralType（第 66 轮）
// xl:expect TypeAssign,UnionType,LiteralType:6
type A = "a" | 1 | 0x10 | true | null | -1
