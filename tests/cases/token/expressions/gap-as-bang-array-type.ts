// xl:note 第 1219 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 「`as T![]` 里那一对空下标落成了 `TupleType`」——根在两处：
// ① `TypeBracketCloseRule.Process` 只看紧邻那一格 ⇒ 它是 `SymbolToken("!")` ⇒
// `IsTypeOperandUnit` 答否 ⇒ 空方括号被当成空元组（第 1219 轮补 `OperandIndex`：
// `!` 与 trivia 各跳一格，被操作的类型是它左边那个类型）；② `!` 收进 `ArrayType` 之后
// `NotNullCloseRule` 又把它折成 `NotNull` ⇒ 从 `ArrayType` 的内容里消失
// （第 1219 轮补 `InsideTypeBracket`：父亲链上有三种类型括号之一就不折）。
// `as T[]` 那一档（`ArrayType > TypeReference`）一直是对的，这一条只有 `!` 那一支显形。
// xl:end
declare const f: any;
type T = any;

const q = f() as T![];
