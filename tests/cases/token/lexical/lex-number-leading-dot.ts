// xl:note 小数点开头的小数是一个字面量：`SymbolToken` 只剩 `=`（`;` 本来就不进产物，`.` 不该单独成符号）
// xl:expect Let,Identifier,SymbolToken:1
const a = .5;
