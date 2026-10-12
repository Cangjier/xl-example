// xl:note for-of 的 const / let / var 三种声明
// xl:expect Foreach,ForeachDefine,ForeachEnumable,ForeachBody
for (const v of xs) {
  f(v)
}
for (let w of xs) {
  f(w)
}
for (var u of xs) {
  f(u)
}
