// xl:note `<…>` 里出现 `&&` / `||` 时那不是类型实参表：整条是**比较运算**（TS 读成两条二元表达式），不是泛型调用
// xl:expect Root,Statement:3,Let:3,SymbolToken:12,LogicalOperator:3,Identifier:11,Bracket:3,String,ConstString
const s = a < b && c > (d);
const t = "a" < b && c > (d);
const u = a < b || c > (d);
