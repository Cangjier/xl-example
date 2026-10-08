// xl:note 抽象构造签名：`abstract` 是签名自己的修饰词，不是悬空的裸关键词；`abstract` 与 `new` 之间夹注释时 `new` 的位置由 token 出的 `NewAt` 定位
// xl:expect Interface,InterfaceBody,Signature,Keyword,Statement:2
interface I { abstract new (): A }
interface J { abstract /* new */ new (): A }
