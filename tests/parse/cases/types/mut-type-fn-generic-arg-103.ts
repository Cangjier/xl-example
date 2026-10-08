// xl:note 函数类型作为泛型实参
// xl:expect TypeAssign,GenericType,TypeDefine,Keyword
// xl:known-gap 注释夹在函数类型的 `=>` 周围 / 泛型实参里：类型段落成散单元（带一处未映射 Bracket）（r660 探针池 mut-type-fn-generic-arg-103）
type X = Wrap<(a: number) /* c */=> void>
