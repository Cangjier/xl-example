// xl:note 数组解构：嵌套解构 + 洞 + 嵌套默认值
const [[a, b], [, c = 0]] = [[1, 2], [3]]
console.log(a, b, c)
