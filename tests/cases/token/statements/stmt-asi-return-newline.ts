// xl:note `return` 之后换行是受限产生式：`return` 与 `-1` 是两条语句
// xl:expect Statement:3,UnaryOperator:1
function f() { return
-1 }
