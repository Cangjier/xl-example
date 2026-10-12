// xl:note 两层二元单元套着、链的续格在最里面（第 743 轮，判据要递归那一格）
// xl:expect BinaryOperator,PropertyAccess,Bracket,SymbolToken
const o: any = { f: () => ({ v: 1 }) };
const r = o["f"]().v * 2 + 1;
