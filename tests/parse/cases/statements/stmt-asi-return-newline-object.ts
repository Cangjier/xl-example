// xl:note ASI：return 换行后跟对象字面量 —— 仍不并入 return，对象字面量按语句位置解析
// xl:expect Function,FunctionBody,Statement
function f() {
  return
  { a: 1 }
}
