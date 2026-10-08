// xl:note 数组解构：嵌套解构 + 洞 + 嵌套默认值
// xl:expect BindingElement,ArrayLiteral,PropertyAccess
const [[a, b], [, c = 0]] = [[1, 2], [3]]
console.log(a, b, c)
