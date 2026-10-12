// xl:note 第 869 轮普查量出的缺口（infer-extends-newline-7）：这一条钉的是上面那条根因的一个落点
// 第 878 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `infer V extends string` 里 `extends` 与约束之间的换行：`InferType` 的约束那一格没成形
// （具体根因：收尾期的 `ContinuesExpression` 没认 `extends` 这个续接词——换行被
//   `Statement.IsLineBreakBoundary` 判成语句边界，`ConditionalTypeCloseRule.FindStart`
//   回扫第一步就停在那个软换行上，条件类型于是从**第二个** `extends` 起算）
type T<U> = U extends infer V 
 extends string ? V : never;
