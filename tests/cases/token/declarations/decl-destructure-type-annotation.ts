// xl:note 解构声明上的类型注解
// xl:expect TypeLiteral,TypeLiteralBody
let { a, b }: { a: number; b: string } = { a: 1, b: "s" }
console.log(a, b)
