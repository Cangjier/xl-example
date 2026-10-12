// xl:note 数组解构：跳位（洞）与中间省略
// xl:expect BindingElement,ArrayLiteral,PropertyAccess
const [, second, , fourth] = [1, 2, 3, 4]
console.log(second, fourth)
