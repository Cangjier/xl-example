// xl:note await using 声明（必须在 async 体内）
// xl:expect Let,FunctionBody,Statement
async function f() {
  await using res = openAsync()
}
