// xl:note 成员类型的前导 `|` 多行联合：整段是一个 UnionType，不能在第一行之后断开
// xl:expect UnionType,Identifier:4
// xl:absent BinaryOperator
interface I {
  m?:
    | A
    | B
    | undefined;
}
