// xl:note 联合成员是限定名：`A | B.C` 里的 `.` 不划边界，整个成员都在节点里
// xl:expect UnionType,SymbolToken
let value: A | NodeJS.TypedArray
