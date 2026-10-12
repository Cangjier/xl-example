// xl:note 原始类型 never 出现在返回类型位置
// xl:expect Function,ReturnType
function f(): never {
  throw 0
}
