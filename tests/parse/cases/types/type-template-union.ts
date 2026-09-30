// xl:note 插值位置是字面量联合的模板字面量类型
// xl:expect TypeAssign
type X = `a${"x" | "y"}b`
