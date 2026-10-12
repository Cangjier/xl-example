// xl:note 对象解构：改名 a: x
// xl:expect BindingElement,ObjectLiteral,PropertyAccess
const { a: x, b: y } = { a: 1, b: 2 }
console.log(x, y)
