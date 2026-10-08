// xl:note 计算成员名的可选泛型方法签名 `[sym]?<K>(…)`（第 66 轮）
// xl:expect Interface,InterfaceBody,MethodDeclaration,GenericType
interface I { [sym]?<K>(error: Error): void }
