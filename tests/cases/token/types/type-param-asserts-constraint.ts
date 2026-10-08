// xl:note 泛型约束里是一个断言谓词
// xl:expect Function,GenericType,TypeParameter
function f9<X extends asserts x is A>(x: X): X { return x; }
