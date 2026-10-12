// xl:note 元组里 `infer X` 之后那一格仍是变长元素：`...T[]` 要收成 RestType
// xl:expect InferType,TypeParameter,RestType,ArrayType,TupleType
type First<T> = T extends [infer U extends string, ...unknown[]] ? U : never;
type Rest = [infer U, ...number[]];
type Plain = [string, ...string[]];
let a: First<["a", 1]>;
let b: Rest;
let c: Plain;
console.log(1);
