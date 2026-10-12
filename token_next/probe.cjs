// token_next 的探针：把几段 TypeScript 喂进 catalog guide + shape token 那条流水线，
// 打出产物树与账。用法：node token_next/probe.cjs
const { Parse } = require("../build/ts/token_next/typescript_tokens/parse.js");
const { TypeScriptToken } = require("../build/ts/token_next/typescript_tokens/typescript-token.js");
const { ParenGuide } = require("../build/ts/token_next/typescript_tokens/shapes/paren-shape.js");
const { SymbolToken } = require("../build/ts/token_next/core/symbol-token.js");
const { SyntaxContext } = require("../build/ts/token_next/core/context.js");
const { Document } = require("../build/ts/token_next/core/source.js");

const cases = [
  ["空输入", ""],
  ["一个名字", "foo"],
  ["一个数字", "42"],
  ["小数与下划线", "1.5 + 1_000"],
  ["十六进制", "0x1F"],
  ["调用", "f(1)"],
  ["嵌套调用", "f(a, g(b))"],
  ["分组", "(a) ;"],
  ["箭头形参", "(a) => b"],
  ["下标", "a[0]"],
  ["数组字面量", "[1, 2]"],
  ["对象字面量", "x = { a: 1 }"],
  ["块", "{ }"],
  ["模板串插值", "`a${x}b`"],
  ["普通串与转义", "'a\\'b' + \"c\""],
  ["注释", "// c\nf(1)"],
  ["块注释", "/* c */ f"],
  ["正则与除号", "a / b; /re/g.test(s)"],
  ["零散符号", "const x = 1;"],
  ["未收敛（括号后面什么都没有）", "g = (a)"],
  ["未闭合", "f(a"],
];

for (const [name, text] of cases) {
  const report = Parse(text);
  console.log("=".repeat(72));
  console.log("用例：" + name + "    输入：" + JSON.stringify(text));
  console.log("形状 " + report.ShapeCount + " 个；账 " + report.NoteCount + " 条；没认领的字符 " + report.DroppedCount + " 个");
  if (report.Notes !== "") {
    console.log("--- 账 ---");
    console.log(report.Notes);
  }
  console.log("--- 产物 ---");
  console.log(report.Formatted);
}

// 池 = 0 那一格（设计 §5 的第一种失败）：**只有「收敛表划多了」才走得到**，
// 所以它不能由合法输入触发——这里直接驱动那一格，证明证据是齐的。
console.log("=".repeat(72));
console.log("用例：池 = 0（直接驱动向导，看证据齐不齐）");
const template = new TypeScriptToken().Assemble();
const context = new SyntaxContext(new Document(""));
const source = new Document("").CreateSource();
// 池里只剩「分组」一组，却又来了一个判别事件 `=>`（这一格本来就该被前一格排除掉）
const guide = new ParenGuide(template, ["GroupShape"]);
const arrow = new SymbolToken(template);
arrow.Text = "=>";
try {
  guide.OnChildClosed(arrow, context, source);
  console.log("没有抛异常 —— 与设计不符");
} catch (error) {
  console.log("异常：" + error.Message);
}
