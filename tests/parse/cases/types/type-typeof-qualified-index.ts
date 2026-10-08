// xl:note `typeof` 的操作数是一个点号名，后面再跟下标访问
// xl:known-gap 点号名在产物里是平级单元，`typeof` 于是吞下整个 `a.b[K]`（缺 4 漂 2 多 1）
// xl:expect TypeAssign,TypeQuery,IndexedAccessType
declare const a: any
declare type K = "k"
type A = typeof a.b[K];
