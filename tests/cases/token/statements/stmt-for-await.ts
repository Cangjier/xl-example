// xl:note async 函数里的 for await (... of ...)：必须仍是 Foreach
// xl:expect Function,FunctionBody,Foreach,ForeachDefine,ForeachEnumable,ForeachBody
async function f() {
  for await (const v of xs) {
    g(v)
  }
}
