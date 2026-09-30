// xl:note 接口体里的无名调用签名必须直接站在 `InterfaceBody` 下，不许再包一层 `Statement`（两条指令注释各占一个 `Statement`，所以这里正好 2）
// xl:expect Interface,InterfaceBody,Signature,Statement:2
interface I { (): void }
