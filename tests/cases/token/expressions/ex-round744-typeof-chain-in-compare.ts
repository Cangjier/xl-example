// xl:note 一元 + 下标调用链 + 相等比较：`typeof o["f"]().v === "number"`（第 744 轮收掉）
// xl:expect UnaryOperator,BinaryOperator,PropertyAccess,Bracket,String
const o: any = { f: () => ({ v: 1 }) };
const r = typeof o["f"]().v === "number";
