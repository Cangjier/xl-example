// xl:note 接口方法的泛型签名
// xl:expect Interface,InterfaceBody,MethodDeclaration,GenericType
interface I {
  map<T, U>(f: (x: T) => U): U[]
}
