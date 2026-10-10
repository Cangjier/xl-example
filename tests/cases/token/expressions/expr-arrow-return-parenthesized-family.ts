// xl:note 箭头函数的返回类型是一对括号时，括号里装什么都要认：函数类型 / 联合 / 再套一层括号 / 表达式体
// xl:round 928
// 与 `gap-arrow-return-parenthesized-function-type.ts` 同一族，第 928 轮一起收掉（这一族是三处判据
// 共用 `IsArrowReturnTypeBracket` 之后才成立的）：`(A | B)` 与 `((() => void))` 的外层括号同样是
// **返回类型**（第 3 句「括号里装的不是形参」在两种装法上都成立），体那个 `{` 也照旧是**块**。
// xl:expect Lamda,ParenthesizedType,UnionType,FunctionType,LamdaBody
// xl:end
const union = (): (A | B) => { return; };
const nested = (): ((() => void)) => { return; };
const withParam = (a: number): ((b: string) => void) => { return; };
const exprBody = (): (() => void) => 1;
