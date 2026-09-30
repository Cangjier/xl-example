// xl:note regular expression on the line after a bare return
// xl:expect Function,FunctionBody,Keyword,RegexToken
function f() {
  return
  /a/.test('a');
}
