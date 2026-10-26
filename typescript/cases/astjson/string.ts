// string 用例集：字符串字面量的**全部写法**（S1–S7）。
// 一行一个用例；行内的 \n 会被 ast-json.mjs 还原成真实换行，所以「字符串里的 \n 转义」写不进来（见末尾暂缓）。
// 生成器会 trim 每行、丢弃以 // 开头的行，所以注释必须独立成行。
// 对拍口径：TS 侧 ts.createSourceFile 的 AST；本仓侧 SourceFileRunner.Parse 的形状树。
// 快照：node typescript/cases/ast-json.mjs string && node typescript/cases/ast-json-diff.mjs string
//
// 覆盖范围（按 TS 词法）：
//   S1  普通字符串：双引号 / 单引号、空串、引号内符号
//   S2  转义序列：\\、\"、\'、\t、\$、\`、单独的 \\、\uXXXX / \xNN / \u{…}、NonEscape（\a \d \{ \ 空格）
//   S3  模板串（无内插）：t 串、空串、单个 $、$ 后不跟 {、花括号字面量、转义反引号、反斜杠、多行
//   S4  模板串（内插）：${a}、前后文本、多个内插、相邻内插、$${a}、\${a}（对照：转义 $ 不内插）、\\${a}（双反斜杠：内插）
//   S5  内插里的表达式：对象 / 数组 / 括号 / 调用 / 字符串 / 嵌套模板
//   S6  标签模板：tag 后缀
//   S7  语句边界与 trivia：多语句、前导注释、行尾注释
//
// 本轮（词法层）的期望：
//   - S1 / S2 / S7 全绿（34 条）：形状层走 StringLiteralShape，text 是转义解码后的值。
//   - S3–S6 的 AST 还是红的（kind 是 StringLiteral，而不是 FirstTemplateToken / TemplateExpression，41 条）：
//     模板形状七页还没有 FromBasicToken，属于形状层下一步。
//     词法层是否正确看 tmp/dump-xml.mjs 的 XML（IsSupportInterpolation=True / 无空 ConstString）。
//
// 暂缓（不写进本用例集；见 docs/string-template-analysis.md §8）：
//   八进制转义 \1 \07 \101        text 已与 ts 对齐，但 ts 会给「不允许八进制」诊断；本用例集只收无诊断的写法
//   非法 \x / \u                  text 已按 ts 的恢复口径保留原文，但 ts 会报诊断；本用例集只收无诊断的写法
//   未闭合模板 / 空内插 ${}        token 树已按 ts 恢复口径（未关闭 / 空单元）；合成空 LastTemplateToken / 空 Identifier 是形状层的活
//   字符串里的 \n 转义            生成器把行内 \n 还原成真换行，写不进来（number.ts 同限制）
//   \ + CRLF / 模板内真 CRLF 归一  token 层已支持；用例按行读，CRLF 写不进这一行一例的格式

// ===== S1 普通字符串 =====
"";
"a";
'a';
"hello world";
"a b";
"a-b_c.1";
"'";
'"';
"a{b}";
"a}b";
"a$b";
"a$";
"${";
"{";

// ===== S2 转义序列 =====
"a\\b";
"a\"b";
'a\'b';
"a\tb";
"a\$b";
"a\`b";
"\\";
"\"";
'\'';
"\u0041";
"\x41";
"\u{1F600}";
"\uD83D\uDE00";
"\a";
"\d";
"\{";
"\ ";

// ===== S3 模板串（无内插）=====
`t`;
``;
`a b`;
`$`;
`a$b`;
`a$`;
`{`;
`}`;
`a{b}c`;
`a\`b`;
`a\\b`;
`a\tb`;
`a\nb`;
`t`; `u`;
/* c */ `t`;

// ===== S4 模板串（内插）=====
`${a}`;
`a${b}c`;
`a${b}`;
`${a}c`;
`a${b}${c}`;
`a${b}c${d}e`;
`${a}${b}`;
`$${a}`;
`$a${b}`;
`$${a}${b}`;
`\${a}`;
`\\${a}`;
`a\${b}c`;
`a$b${c}d`;

// ===== S5 内插里的表达式 =====
`a${ {x:1} }b`;
`a${{x:1}}b`;
`a${f()}b`;
`a${f(1, 2)}b`;
`a${"}"}b`;
`a${'}'}b`;
`a${(1 + 2)}b`;
`a${[1, 2]}b`;
`a${`b`}c`;
`a${`b${c}d`}e`;

// ===== S6 标签模板 =====
tag`t`;
tag`a${b}c`;

// ===== S7 语句边界与 trivia =====
"a"; "b";
/* c */ "a";
"a"; // c
