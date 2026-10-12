// xl:note 推断类型 infer X / infer X extends Y：InferType 里配一个 TypeParameter（第 66 轮）
// xl:expect InferType:3,TypeParameter:6,ConditionalType:3
type A<T> = T extends (a: infer U) => any ? U : never;
type B<T> = T extends infer U extends string ? U : never;
type C<T> = T extends { m(): infer V extends object } ? V : T;
