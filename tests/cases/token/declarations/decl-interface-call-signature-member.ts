// xl:note 接口体里的无名调用签名必须直接站在 `InterfaceBody` 下，不许再包一层 `Statement`
// xl:expect Interface,InterfaceBody,Signature
interface I { (): void }
