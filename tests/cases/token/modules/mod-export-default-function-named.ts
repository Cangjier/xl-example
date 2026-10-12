// xl:note 具名的默认导出函数：`export default function f() { … }` 就是一条函数声明，
// 修饰词 `export,default` 折进 `Function` 的 `modifiers`。
// 这条用例原来的期望里写着 `ReturnType`——但源码里没有返回类型标注，那个期望是多余的
// xl:expect Function,FunctionBody
// xl:absent ReturnType
export default function f() {
  return 1;
}
