// xl:note 索引签名：接口 / 类 / 类型字面量三处的 `[k: string]: T` 都收成 IndexSignature（第 66 轮第五批）
// xl:expect IndexSignature:3,Interface,Class,TypeLiteral,Keyword
interface I { [k: string]: number }
class C { readonly [k: symbol]: string }
type T = { [k: number]: string };
