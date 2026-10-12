// xl:note 注释夹在 `infer` 与名字之间：照旧收成 InferType > TypeParameter
// xl:expect InferType,TypeParameter,ConditionalType
type A<T> = T extends infer /*c*/ U ? U : never
type B<T> = T extends (a: infer /*c*/ V) => any ? V : never
