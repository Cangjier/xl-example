// xl:note `let` 后换行再跟数组解构赋值：ASI 必须断成两条，否则 `let [a]` 变成声明
// xl:expect Let,Statement
let a = 1
;[a] = b
