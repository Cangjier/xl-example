// xl:note 类型别名的右值走**类型位投影**：`Array<any>` 要投成一个 TypeReference（同一区间两层节点），按第一个单元投会整片丢掉实参
// xl:expect TypeAssign,Identifier,GenericType
type I = Array<any>;
