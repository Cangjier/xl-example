// xl:note 类型成员里名字叫 `function` 的方法签名（不是函数声明）
// xl:expect MethodDeclaration
// xl:absent Function
interface I {
  function(name: string): void
}
