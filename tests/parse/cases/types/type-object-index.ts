// xl:note 字符串与数字两种索引签名：各自收成一个 Field（名字是 `k` / `i`）
// xl:expect TypeAssign,TypeDefine,TypeLiteral,TypeLiteralBody,Field
type X = { [k: string]: number; [i: number]: string }
