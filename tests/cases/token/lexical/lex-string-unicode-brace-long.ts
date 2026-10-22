// xl:note 字符串字面量的 `\u{…}` 位数不限（ECMAScript）：前导零任意多，累计码点 ≤ U+10FFFF；
// 字符串、无内插模板串、带标签模板的 cooked 都按码点解码（带标签模板的 rawText 仍是原文）。
// xl:expect Statement,Let,String,ConstString,Identifier
const a = "\u{0000061}";
const b = "\u{000000000000041}";
const c = "\u{000000000010FFFF}";
const d = `\u{0000061}`;
const e = tag`\u{0000061}`;
