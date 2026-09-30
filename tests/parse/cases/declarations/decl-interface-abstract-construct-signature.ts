// xl:note 抽象构造签名：`abstract` 是签名自己的修饰词，不是悬空的裸关键词（两条指令注释各占一个 `Statement`，所以这里正好 2）
// xl:expect Interface,InterfaceBody,Signature,Keyword,Statement:2
interface I { abstract new (): A }
