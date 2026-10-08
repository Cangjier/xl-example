// xl:note return 之后的不可达语句仍要各自成形
// xl:expect Function,FunctionBody,Statement
function f() {
  return 1
  g()
}
