// xl:note ECMAScript `?.` lookahead：`?` 与 `.` 只有后随字符不是十进制数字时才合成 QuestionDot。
// `a?.5:b` 必须切成 `?` 与 `.5`，解析成条件表达式（TS 6.0.3 diag=0）。
// xl:expect ConditionalExpression,QuestionToken,NumericLiteral,ColonToken,PropertyAccessExpression,QuestionDotToken
// xl:round cover6-E
const x = a?.5:b;
const y = a?.b;
