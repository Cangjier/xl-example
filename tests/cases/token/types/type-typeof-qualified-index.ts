// xl:note `typeof` 的操作数是一个点号名，后面再跟下标访问
// 第 854 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 「`typeof a.b[K]` 里 `TypeQuery` 吞下整段（缺 `IndexedAccessType` / `QualifiedName` /
// `TypeReference`，`TypeQuery` 与 `Identifier` 两处漂）」——点号名与下标在产物里是**平级单元**
// （`[TypeQuery(typeof a), ., IndexedAccessType(b, K)]`），而 `a.b` 那一支只按名字往右套。
// 修法见 `print-ast-common.xl.md` 的 `absorbIntoTypeQuery`：尾段先按自己的规矩投出来，
// 再把链上最左边那一格名字换成整条 `TypeQuery`。
// xl:expect TypeAssign,TypeQuery,IndexedAccessType
declare const a: any
declare type K = "k"
type A = typeof a.b[K];
