// xl:note 位运算三层的优先级：`b | c & d` 里 `&` 比 `|` 紧（TS 给 `b | (c & d)`）——三个运算符原来折在同一层，产物是 `(b | c) & d`
// xl:round 916
// xl:expect BinaryOperator,Identifier,SymbolToken,Let
// xl:end
const a = b | c & d;
