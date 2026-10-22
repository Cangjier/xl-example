// xl:note 带标签模板里的非法转义（legacy octal / NonOctalDecimalEscape）：
// ts 的 text 取原文（cooked 为 undefined），合法转义（\n）仍然 cooked。
// xl:expect Statement,Let,String,ConstString
const a = tag`\8`;
const b = tag`a\n\8b`;
const c = tag`\1\7`;
const d = tag`\377`;
const e = tag`\08x`;
const f = tag`a${x}b\9`;
