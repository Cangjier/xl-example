// xl:expect Let,ObjectLiteral,BindingElement,AreaAnnotation
// xl:note 重命名元素中间夹注释
const { b: /* c */ c } = o;
console.log(c);
