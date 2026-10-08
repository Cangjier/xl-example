// xl:title AST 语料 declarations/decl-obj-destructure-rest.ts：decl obj destructure rest
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note 对象解构：剩余属性 ...rest
//  xl:expect BindingElement,ObjectLiteral,PropertyAccess
const { a, ...rest } = { a: 1, b: 2, c: 3 }
console.log(a, rest)
