// xl:note 第 869 轮普查量出的缺口（abstract-construct-comment-5）：这一条钉的是上面那条根因的一个落点
// xl:known-gap `abstract new /*c*/ () => X`：注释夹在 `new` 与形参表之间、**而前面还有一个 `abstract`** 时整条构造类型不成形——前面那个 `abstract` 会在注释收尾那一趟被升级成 `Keyword`（第 848 轮的 `IsUpgradable`：后面跟着 `new`），而那次替换之后 `FunctionTypeCloseRule` 就再也轮不到（实测缺 `ConstructorType` / `AbstractKeyword`，多 `TypeReference` + `Identifier`）。第 873 轮把这一族的另外几条（注释在 `abstract` 与 `new` 之间、换行那两格、`new /*c*/ (…)` 的成员签名）都收掉了，**只留这一条**——它不是 trivia 口径的问题（`zzz new /*c*/ () => X` / `readonly new /*c*/ ()` 都是好的），根在升级那一趟的时序
type T = abstract new /*c*/ () => X;
