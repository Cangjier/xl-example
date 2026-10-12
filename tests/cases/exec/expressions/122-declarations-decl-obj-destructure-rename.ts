// xl:title AST 语料 declarations/decl-obj-destructure-rename.ts：decl obj destructure rename
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note 对象解构：改名 a: x
//  xl:expect BindingElement,ObjectLiteral,PropertyAccess
const { a: x, b: y } = { a: 1, b: 2 }
console.log(x, y)
