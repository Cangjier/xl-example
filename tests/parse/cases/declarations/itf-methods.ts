// xl:expect Interface,InterfaceBody,MethodDeclaration,GenericType,ReturnType,TypeDefine
// xl:note 接口里的方法成员：`m<T>(x: T): T` 是方法签名，`get x(): number` / `set x(v: number)`
// 折成带 `Modifiers="get"` / `"set"` 的方法声明（与类里的取值器同一套模型）。
// 这条基线用例原来的期望是 `Interface,Field`——那是取值器还没有归宿时的形状
interface I {
  m<T>(x: T): T
  get x(): number
  set x(v: number)
}
