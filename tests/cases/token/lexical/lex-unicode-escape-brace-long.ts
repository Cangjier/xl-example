// xl:note cover6-F：`\u{…}` 花括号转义位数不限（ECMAScript `UnicodeEscapeSequence` 只要求累计码点 ≤ 0x10FFFF）；
// xl:note 修前 core/common.xl.md 写死 1–6 位，7 位以上前导零的合法形在这里 crash「变量声明缺少标识符」。
// xl:expect Let,Function,Class,ObjectLiteral,MethodDeclaration
// xl:absent VariableStatement,VariableDeclarationList,VariableDeclaration,NumericLiteral,TypeReference
const \u{61} = 1;
const \u{0061} = 1;
const \u{000061} = 1;
const \u{0000061} = 1;
const \u{000000061} = 1;
const \u{000000000000000000061} = 1;
const \u{0000000000000000000000000000000061} = 1;
const a\u{0000062}c = 1;
const \u{0000061}\u{0000062} = 1;
const \u{000005F} = 1;
const \u{0000024} = 1;
const \u{0001D400} = 1;
const \u{0000001D400} = 1;
const o = { \u{0000061}: 1 };
function f\u{0000066}() {}
class G { \u{0000062}() {} }
const p = o.\u{0000062};
let t: \u{0000049};
