// xl:note 函数体内的 new.target：标签表没有对应标签
// xl:expect FunctionBody,Function
function f() {
  new.target;
}
