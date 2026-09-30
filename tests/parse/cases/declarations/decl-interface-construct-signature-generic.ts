// xl:note 泛型构造签名
// xl:expect Interface,InterfaceBody,GenericType,Signature
interface I {
  new <T>(x: T): T
}
