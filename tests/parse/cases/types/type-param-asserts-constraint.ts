// xl:note 泛型约束里是一个断言谓词
// xl:known-gap 约束位上的 `asserts x is A` 不成形（缺 5 多 2）
// xl:expect Function,GenericType,TypeParameter
function f9<X extends asserts x is A>(x: X): X { return x; }
