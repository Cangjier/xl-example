// xl:note 调用签名与构造签名（new 属于 Keyword 表）；
// 本文件是**类型字面量**里的签名（父单元是 ObjectLiteral），Signature 规则只认 InterfaceBody / ClassBody，
// 所以这里不钉 Signature——类型字面量的成员是另一条已知缺口
// xl:expect TypeAssign,TypeDefine,Keyword,TypeLiteral,TypeLiteralBody
type X = { (a: number): void; new (a: number): A }
