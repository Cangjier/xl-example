// xl:note 对象解构：计算属性名 [k]: v
const k = "a"
const { [k]: v } = { a: 1 } as Record<string, number>
console.log(v)
