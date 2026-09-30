// xl:note 对象解构：剩余属性 ...rest
const { a, ...rest } = { a: 1, b: 2, c: 3 }
console.log(a, rest)
