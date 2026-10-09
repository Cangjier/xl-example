// xl:note 第 869 轮普查量出的缺口（infer-extends-comment-5）：这一条钉的是上面那条根因的一个落点
// xl:known-gap `infer V extends string` 里 `extends` 与约束之间的注释 / 换行：`InferType` 的约束那一格没成形
type T<U> = U extends /*c*/ infer V extends string ? V : never;
