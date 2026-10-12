// xl:note for-in 的 const 与 var 形式
// xl:expect Foreach,ForeachDefine,ForeachEnumable,ForeachBody
for (const k in obj) {
  f(k)
}
for (var j in obj) {
  f(j)
}
