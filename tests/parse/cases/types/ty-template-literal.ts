// xl:note 基线用例（来自缺口审计语料）
// xl:expect InterpolationString,LiteralType,GenericType,TypeAssign
type T = `a${string}b`
type U = `${number}-${string}`
type V = Uppercase<"a">
