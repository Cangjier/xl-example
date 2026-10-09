// xl:note 第 869 轮普查量出的缺口（infer-extends-comment-1）：这一条钉的是上面那条根因的一个落点
// xl:known-gap `type /*c*/ T<U> = …`：`type` 与别名之间的注释让**类型参数表**整个没接上（缺 `TypeParameter`、字段少 `typeParameters`）
type /*c*/ T<U> = U extends infer V extends string ? V : never;
