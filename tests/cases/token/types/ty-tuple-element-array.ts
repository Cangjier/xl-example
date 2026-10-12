// xl:note 元组元素里的数组类型：`[C[]]`——那个空方括号是**元组元素**的类型后缀，TS 那边是 `TupleType > ArrayType > TypeReference(C)`
// xl:round 916
// xl:expect TupleType,ArrayType,Identifier,SymbolToken
// xl:end
type X = [C[]];
