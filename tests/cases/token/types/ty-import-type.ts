// xl:note 基线用例（来自缺口审计语料）
// xl:expect ImportType,GenericType,TypeAssign
type A = import("./x").B
type C = import("./x").D<string>
type E = typeof import("./x")
