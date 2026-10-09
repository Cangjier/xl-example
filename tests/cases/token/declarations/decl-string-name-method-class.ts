// xl:note 类成员同理：字符串名 + 类型参数段仍是**一个** `MethodDeclaration`（宿主是 `ClassBody`，与接口体同一条名字闸）
// xl:expect Root,Class,ClassBody,MethodDeclaration,GenericType,TypeParameter,Identifier:5,Bracket,Parameter,TypeDefine:2,ReturnType,MethodBody,Statement,Keyword
class C {
  "a"<T>(x: T): T {
    return x;
  }
}
