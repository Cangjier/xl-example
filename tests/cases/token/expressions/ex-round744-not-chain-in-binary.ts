// xl:note `!` 那一半：`!o["f"]().v + ""`（第 744 轮同一支收掉）
// xl:expect BinaryOperator,PropertyAccess,Bracket,String
const o: any = { f: () => ({ v: 1 }) };
const r = !o["f"]().v + "";
