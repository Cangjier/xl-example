// xl:note 对象解构：嵌套对象/数组解构与改名并存
// xl:expect ObjectLiteral:2,ArrayLiteral,Let
const { a: { b }, c: [d] } = { a: { b: 1 }, c: [2] }
console.log(b, d)
