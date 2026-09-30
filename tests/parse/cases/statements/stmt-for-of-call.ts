// xl:note for-of 的被枚举对象是调用表达式
// xl:expect Foreach,ForeachDefine,ForeachEnumable,ForeachBody
for (const v of list()) {
  f(v)
}
