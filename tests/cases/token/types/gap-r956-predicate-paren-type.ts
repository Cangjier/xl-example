// xl:note 类型谓词里那个类型**套一层圆括号**时，整条谓词不成形（第 956 轮片段普查量出）：
// `function f(x: unknown): x is (string)` 里 TS 是
// `TypePredicate > (AssertKeyword) + Identifier + ParenthesizedType`，而产物缺 `TypePredicate`
// / `ParenthesizedType` / 类型自己的那个关键字（`x is (string)` 整条丢掉，多出 1~2 格）。
// **不是**第 956 轮收掉的那一族（那一族是「成员的类型 / 返回类型」，判据在
// `SignatureCloseRule.Previous` 的「上一个实义单元是不是 `:`」那一问上，与谓词无关）。
// **同一形状在别处是好的**：不带括号的谓词（`x is string` / `asserts x is string`）逐节点一致。
// **入手处**：类型谓词那条投影路径（`tokens/type-predicate.xl.md` 的 `PrintAst`）——
// 它认的是「谓词后面那一格直接是类型」，括号那一层要么先问现成的类型位入口、
// 要么让谓词的类型那一格走**与成员类型同一条**投影（**别在谓词里另写一份括号判据**）。
// xl:known-gap 类型谓词成形了（第 957 轮把 ( 从调用那一趟要了回来），但类型那一格还停在一对裸 Bracket 上（缺 ParenthesizedType / StringKeyword，多 4）：ParenthesizedTypeCloseRule 的闸门是「父亲是类型容器」，而括号关闭那一刻父亲还不是它
// xl:end
function f(x: unknown): x is (string) { return true; }
function g(x: unknown): asserts x is (string) {}
interface I { m(x: unknown): x is (string) }
const h = (x: unknown): x is (A | B) => true;
