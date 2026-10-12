// xl:note 查询整个模块的 import 类型 typeof import("./m")
// xl:expect TypeAssign,Keyword
type X = typeof import("./m")
