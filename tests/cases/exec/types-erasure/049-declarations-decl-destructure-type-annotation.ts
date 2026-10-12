// xl:title AST 语料 declarations/decl-destructure-type-annotation.ts：decl destructure type annotation
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note 解构声明上的类型注解
//  xl:expect TypeLiteral,TypeLiteralBody
let { a, b }: { a: number; b: string } = { a: 1, b: "s" }
console.log(a, b)
