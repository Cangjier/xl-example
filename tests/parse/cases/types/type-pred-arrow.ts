// xl:note 箭头函数上的类型判定返回标注
// xl:expect Lamda,TypeDefine,ReturnType,Keyword
const isStr = (x: unknown): x is string => typeof x === "string"
