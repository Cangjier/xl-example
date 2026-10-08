// xl:title AST 语料 declarations/decl-arr-destructure-rest.ts：decl arr destructure rest
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note 数组解构：剩余元素 ...rest
//  xl:expect BindingElement,ArrayLiteral,PropertyAccess
const [head, ...tail] = [1, 2, 3]
console.log(head, tail)
