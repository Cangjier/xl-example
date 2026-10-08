// xl:title AST 语料 declarations/decl-obj-destructure-defaults.ts：decl obj destructure defaults
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note 对象解构：默认值（默认值旁边没有 ? 与 : 组成三元）
//  xl:expect TypeLiteral,TypeLiteralBody
const { a = 1, b: c = 2 } = {} as { a?: number; b?: number }
console.log(a, c)
