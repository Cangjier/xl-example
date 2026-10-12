// xl:note 一元前缀 + 下标调用链 + 更松的二元：`typeof o["f"]().v + ""`（第 744 轮收掉）
// xl:expect UnaryOperator,PropertyAccess,Bracket,BinaryOperator,String
const o: any = { f: () => ({ v: 1 }) };
const r = typeof o["f"]().v + "";
