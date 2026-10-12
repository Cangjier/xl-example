// xl:note 成员名可以是字符串字面量：`"a"(x: string): void` 与带类型参数段的 `"b"<T>(x: T): T` 都各是一个 `MethodSignature`
// xl:expect Root,Interface,InterfaceBody,MethodDeclaration:3,Bracket:3,Parameter:3,Identifier:10,TypeDefine:6,ReturnType:3,Keyword,GenericType:2,TypeParameter:2
interface I {
  "a"(x: string): void
  "b"<T>(x: T): T
  'c'<U>(y: U): U
}
