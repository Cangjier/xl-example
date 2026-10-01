// xl:note 元组成员四种形状：可选 `A?` / 变长 `...B` / 具名 `name: D?` / 具名变长 `...rest: E[]`（第 66 轮第三批）
// xl:expect TupleType,OptionalType,RestType,NamedTupleMember:2,ArrayType
type T = [A?, ...B, C, name: D?, ...rest: E[]];
