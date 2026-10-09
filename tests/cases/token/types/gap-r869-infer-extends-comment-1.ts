// xl:note 第 869 轮普查量出的缺口（infer-extends-comment-1）：这一条钉的是上面那条根因的一个落点
type /*c*/ T<U> = U extends infer V extends string ? V : never;
