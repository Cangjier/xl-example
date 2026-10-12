// xl:note 第 869 轮普查量出的缺口（abstract-construct-comment-5）：这一条钉的是上面那条根因的一个落点
// 第 881 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `abstract new /*c*/ () => X` —— 注释夹在 `new` 与形参表之间、而前面还有一个 `abstract` 时
// 整条构造类型不成形。根因不在升级那一趟的时序，而在 `LamdaCloseRule.IsLambdaParameters`
// 那一问只跳软换行、不跳注释：`(` 前面紧邻的是那条注释 ⇒ 往左第一格取到 `AreaAnnotation`
// ⇒ 下面每一档都不命中 ⇒ 落到末尾那句「是形参表」⇒ `FunctionTypeCloseRule` 拿到
// `FindParameters >= 0`、把这段函数类型让给箭头函数（缺 `ConstructorType` / `AbstractKeyword`，
// 多出 `TypeReference` + `Identifier`）。修法是把那一格改成 trivia 口径（与
// `FindParameters` / `FunctionTypeCloseRule.Previous` 早就用的同一张口径），并把 `new` 那一档
// 从「按类认」改为「按词认」（`WordText`，注释会让它在被问到时已经是 `Keyword`）。
type T = abstract new /*c*/ () => X;
