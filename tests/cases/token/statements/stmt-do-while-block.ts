// xl:note do...while 带块体：合法 TS，正确解析至少要成形并给出循环结构
// xl:expect DoWhile
do {
  f()
  x++
} while (x < 10)
