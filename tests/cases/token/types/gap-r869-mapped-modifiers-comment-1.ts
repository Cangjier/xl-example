// xl:note 第 869 轮普查量出的缺口（mapped-modifiers-comment-1）：这一条钉的是上面那条根因的一个落点
type /*c*/ T<U> = { readonly [K in keyof U as `x${K & string}`]+?: U[K] };
