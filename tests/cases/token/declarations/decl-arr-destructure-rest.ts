// xl:note 数组解构：剩余元素 ...rest
// xl:expect BindingElement,ArrayLiteral,PropertyAccess
const [head, ...tail] = [1, 2, 3]
console.log(head, tail)
