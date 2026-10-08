// xl:note 块语句里的函数声明（函数体不得外溢到块外）
// xl:expect Function,FunctionBody
{
  function g() {
    return 1
  }
  g()
}
