// xl:title AST 语料 declarations/decl-arr-destructure-nested.ts：decl arr destructure nested
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note 数组解构：嵌套解构 + 洞 + 嵌套默认值
//  xl:expect BindingElement,ArrayLiteral,PropertyAccess
const [[a, b], [, c = 0]] = [[1, 2], [3]]
console.log(a, b, c)
