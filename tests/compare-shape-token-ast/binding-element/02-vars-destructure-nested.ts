// token: BindingElement
// xl:expect Let
// xl:note 基线用例（来自缺口审计语料）
let { a: { b: [c, d = 2] = [] } = {}, ...rest } = obj
