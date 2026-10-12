// xl:expect Let,ArrayLiteral,BindingElement,AreaAnnotation
// xl:note 数组解构元素前的注释不撑区间
const [/* c */ b] = p;
console.log(b);
