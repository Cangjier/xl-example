// xl:note 语句开头的泛型箭头函数：`<T` 与 `,>` 之间换行——宿主那一格还是空的（`IsOperandStartUnit` 的第一档），`<…>` 只可能是类型参数表
// xl:round 914
// xl:expect GenericType,Lamda,TypeParameter,Parameter,Identifier
// xl:end
<T
,>(a: T) => a;
