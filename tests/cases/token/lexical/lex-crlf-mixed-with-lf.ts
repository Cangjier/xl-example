// xl:note 混合行尾（同一份里既有 CRLF 又有 LF）照样读得对——与 `lex-crlf` 同一条口径。
// xl:note 第 685 轮实测：纯 LF / 纯 CRLF / 混合三种变体的标签计数一字不差。
// xl:note 它钉的是「换行风格不改变产物」，不是「盘上必须是混合行尾」。
// xl:expect Let,Statement,Function,FunctionBody,Bracket
// xl:expect FunctionBody,Function
const a = 1;
function f() {
  return a;
}
