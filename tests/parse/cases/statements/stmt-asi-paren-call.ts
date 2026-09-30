// xl:note ASI：赋值语句下一行以 `(` 开头，必须断句，不能被当成调用
// xl:expect Statement
x = y
(function () {
  f()
})()
