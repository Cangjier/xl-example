// xl:note 注释夹在 `type` 与别名之间时，函数类型照样成形（`IsTypeAliasAssignment` 往回走也要跨 trivia）
// xl:round 927
// xl:expect TypeAssign,FunctionType,SymbolToken,Keyword
// xl:end
type /*c*/ T = () => void;
