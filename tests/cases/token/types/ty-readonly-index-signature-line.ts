// xl:note 索引签名的修饰词与 `[` **同一行**（第 912 轮补的守卫）：TS 那边是**一条**带 `ReadonlyKeyword` 的 `IndexSignature`
// xl:round 912
// 守卫的是 `IsMemberBoundary` 里那条新例外：它只在「换行前面那一格是声明修饰词」时才让 `[` 另起成员，
// 同一行写的这一格仍要走普通路径（修饰词收进 `IndexSignature`，不能被拆成两条成员）。
// xl:end
interface I { readonly [k:string]:number }
