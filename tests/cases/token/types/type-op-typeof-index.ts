// xl:note `typeof a[K]` / `typeof a[]`：方括号比 typeof 松，被操作的是 TypeQuery（`(typeof a)[K]`）
// xl:expect TypeQuery,IndexedAccessType,ArrayType
declare const a: any
declare type K = "k"
declare type L = "l"
type A = typeof a[K]
type B = typeof a[]
type C = typeof a[K][L]
type D = typeof a["k"]
