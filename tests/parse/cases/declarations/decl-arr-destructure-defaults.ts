// xl:note 数组解构：默认值（默认值属于解构元素，不是三元或逻辑表达式）
const [a = 1, b = a] = [] as number[]
console.log(a, b)
