// xl:note 下标调用链落在二元单元里：左边操作数那一半（第 743 轮收掉）
// xl:expect BinaryOperator,PropertyAccess,Bracket,Identifier
const o: any = { f: () => ({ v: 1 }) };
const r = o["f"]().v + 1;
