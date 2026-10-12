// xl:note 第 958 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `function f(x: unknown): x is (string)` 整条谓词不成形——TS 是
// `TypePredicate > Identifier + ParenthesizedType`，产物却是 `<Method name="is">`
//（缺 `TypePredicate` / `ParenthesizedType` / 类型自己的那个关键字，多出若干格）。
//
// **根因是「谁先看见那一格」**：谓词那两条规则的闸门是 `IsTypeContainerUnit(父亲)`，
// 而谓词的类型**套一层圆括号**时，**括号关闭那一刻**这一格的父亲还不是类型容器
//（判据那一趟来晚了）；可 `MethodCloseRule` **恰恰在那一刻**看到平级的
// `[名字, is, (…)]`，于是把 `(` 当成实参表收成一次调用。
//
// **两轮收完**：第 957 轮在 `MethodCloseRule.Previous` 上下闸门
//（`TypePredicateCloseRule` 构造时装进 `PredicateShape`，判据只有一份），
// 第 958 轮把那个括号**当场收成 `ParenthesizedType`**（`Claim`），并给
// `IsTypeContainerUnit` 的白名单补上 `TypePredicate`（谓词里只可能有类型）。
//
// 四条守卫：函数 / `asserts` / 接口成员 / 箭头函数（返回类型位）逐节点与 TS 一致。
// xl:end
function f(x: unknown): x is (string) { return true; }
function g(x: unknown): asserts x is (string) {}
interface I { m(x: unknown): x is (string) }
const h = (x: unknown): x is (A | B) => true;
