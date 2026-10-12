// xl:note 行尾不影响 token 流：同一段代码在纯 CRLF / 纯 LF / 混合三种行尾下产物逐标签相同。
// xl:note 第 685 轮实测：四种变体的标签计数一字不差——CRLF 与 LF 在这一层同解。
// xl:note 所以这条**不**断言「盘上必须是 CRLF」，它断言的是「换行风格不改变产物」。
// xl:note （`.gitattributes` 是 `* text=auto eol=lf`，库里的文本文件都是 LF；这一份在盘上带 CRLF。）
// xl:expect Let,Statement,Function,FunctionBody,Bracket
// xl:expect FunctionBody,Function
const a = 1;
const b = 2;
function f() {
  return a;
}
