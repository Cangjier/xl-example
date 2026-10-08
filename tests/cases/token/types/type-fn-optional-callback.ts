// xl:note 可选回调的类型标注：`cb?: (e: Error) => void` 里那个 `?:` 是一个符号单元
// xl:expect FunctionType,MethodDeclaration
// xl:absent Lamda
interface I {
  m(cb?: (e: Error) => void): void
}
