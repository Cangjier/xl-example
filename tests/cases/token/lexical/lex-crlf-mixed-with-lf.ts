// xl:note CRLF directive lines with LF body lines
// xl:expect Const,Statement,Function,FunctionBody,BlockToken
// xl:expect FunctionBody,Function
const a = 1;
function f() {
  return a;
}
