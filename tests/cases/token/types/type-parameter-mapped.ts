// xl:note 映射类型的键是 TypeParameter，键里的约束照常成形（第 66 轮）
// xl:expect MappedType:2,TypeParameter:2,TypeOperator:2
type A = { [K in keyof T]: 1 };
type B = { [P in keyof T]?: T[P] };
