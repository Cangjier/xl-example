// xl:note 第 1220 轮新立（这一族原来**整份文件投不出来**）：`a<b> as T` 里那一对尖括号
// 退回了比较运算符，于是折成 `BinaryOperator(>, BinaryOperator(<, a, b), As(T))`——
// 那个 `As` 的基名留在外面（`As` 只装 `as` 右边那一段），投影走到它时当场抛
// `这一格没有覆写 PrintAst（Tag=As）`。根在两处：
// ① `GenericTypeBranch.IsAllowedFollower` 表达式位那张白名单是**逐字符**的，
// `as` / `satisfies` / `in` / `instanceof` 四个词一个都不在里面——而 TS 那句
// `canFollowTypeArgumentsInExpression` 的兜底 `isBinaryOperator()` 认的正是它们
// （`+` `-` `<` `>` 在它前面就被显式挡掉了）。补法是**读整词再比一次**（要词边界：
// `assertEquals` 以 `as` 开头，可它是一个名字）。
// ② 投影 0a 那一支（实例化表达式）只看前两格就 `return`，尾巴那格 `As` 落到
// `foldBinaryFrom` 手上，而它开头一句就是「`rest` 必须以运算符打头」⇒ 整格丢
// （投出来是**一条** `ExpressionWithTypeArguments`、区间还盖住了 `as T`）。现在有
// `As` / `Satisfies` 时 0a 让开、交给主流程第 2 节——与第 664 轮 `asAfterNco` 同一条口径。
// xl:end
declare const a: any, b: any, c: any, C: any, f: any;
interface T {}

a<b> as T;
a<b> satisfies T;
a<b> instanceof C;
a<b> in c;
a<b>`t` as T;
[a<b> as T];
f(a<b> as T);
