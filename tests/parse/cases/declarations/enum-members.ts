// xl:note 枚举成员：`A = 1` / `B` / `C = 1 | 2` 各收成一个 EnumMember，初始化式里的位运算照常成形（第 66 轮第三批）
// xl:expect Enum,EnumBody,EnumMember:3,BinaryOperator
enum E { A = 1, B, C = 1 | 2 }
