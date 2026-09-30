// xl:note 嵌套模板字面量类型
// xl:expect TypeAssign
type X = `a${`b${string}c`}d`
