// xl:note 数字分隔符不该挡住小数点：`SymbolToken` 只剩 `=`，那个 `.` 属于 `1_000.5` 这个字面量
// xl:expect Let,Identifier,SymbolToken:1
const a = 1_000.5;
