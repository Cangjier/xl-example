// xl:expect Let,ObjectLiteral,BindingElement,AreaAnnotation
// xl:note 对象解构元素前的注释不撑 BindingElement 的区间
const { /* c */ a } = o;
console.log(a);
