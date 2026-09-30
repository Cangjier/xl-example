// xl:note 语句位置的 `{ a: 1 }`：块语句里一个带标签语句，不是对象字面量。
// 之前那个 `{` 会被收成 `JsonObject`（第二次扫描时它的父亲已经是 `Statement`，
// 而 `Statement` 不在 `IsStatementList` 的白名单里 —— 见 text-common-util.xl.md）
// xl:expect Bracket,Label,Statement
// xl:absent JsonObject
{
  a: 1
}
