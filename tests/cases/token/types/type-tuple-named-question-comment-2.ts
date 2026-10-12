// xl:note 具名元组元素的 `?` 与冒号之间夹注释（第 900 轮）：`?` 落在成员中间，`TypeDefine` 的第一格不再是 `?` ⇒ 投影那一格整个丢失（字段名 `[name,type]` vs TS `[name,questionToken,type]`）；改从成员的 `OptionalType` 尾字符把那个 `?` 取回来
// xl:round 900
// xl:expect NamedTupleMember:1,TupleType:1,TypeAssign:1,TypeDefine:1,Identifier:2,SymbolToken:2
// xl:end
type T = [a /*c*/ ? /*d*/ : string];
