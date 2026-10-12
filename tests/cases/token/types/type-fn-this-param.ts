// xl:note 带 this 形参的函数类型（this 属于 Keyword 表）
// xl:expect TypeAssign,TypeDefine,Keyword
type X = (this: Window, a: number) => void
