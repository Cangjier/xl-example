// xl:note 字符串与数字两种索引签名：各自收成一个 IndexSignature（参数名是 `k` / `i`；第 66 轮第五批）
// xl:expect TypeAssign,TypeDefine,TypeLiteral,TypeLiteralBody,IndexSignature:2
type X = { [k: string]: number; [i: number]: string }
