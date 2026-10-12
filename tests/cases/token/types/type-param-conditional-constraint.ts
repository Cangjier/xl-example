// xl:note 泛型约束里是一个嵌套条件类型
// xl:expect Function,GenericType,TypeParameter,ConditionalType
function f7<X extends A extends B ? C : D>(x: X): X { return x; }
