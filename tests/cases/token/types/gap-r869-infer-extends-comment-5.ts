// xl:note 第 869 轮普查量出的缺口（infer-extends-comment-5）：这一条钉的是上面那条根因的一个落点
// 第 874 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `infer V extends string` 里 `extends` 与约束之间的注释 / 换行：`InferType` 的约束那一格没成形
// （具体根因：`IsInsideExtendsType` 回扫时夹在 `infer` 前面的那条注释没跳过去 ⇒ 约束被整段丢掉）
// 同族的 `-newline-7`（换行落在 `infer V` 与 `extends` 之间）**这一轮没做**，如实留着。
type T<U> = U extends /*c*/ infer V extends string ? V : never;
