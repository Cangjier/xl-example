// xl:expect Let,ArrayLiteral,BindingElement,AreaAnnotation
// xl:note 剩余元素前的注释不撑区间
const [/* c */ ...rest] = p;
console.log(rest);
