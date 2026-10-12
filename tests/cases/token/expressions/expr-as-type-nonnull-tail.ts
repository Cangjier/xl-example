// xl:note 第 1207 轮收掉：`as` / `satisfies` 后面那个类型的**尾部 `!`**（TypeScript 的
// `JSDocNonNullableType`）。第 289 轮那张「类型已经写完、后面跟的是值位运算符」的名单里带着
// `!`，于是 `AsCloseRule` 把 `!` 当收工点：`As` 只收到 `T`、`!` 留在外面。
// 症状不是「少一个节点」而是**一格错值**：`const q = f() as T!` 的那个 `!` 被声明那一层
// 收成了 `VariableDeclaration.exclamationToken`（TS 那边它属于类型）。
// `ts.createSourceFile` 实测：`JSDocNonNullableType[16,19)` 把 `T!` 两格全包、
// `AsExpression[9,19)` 的 `end` 也跟着到 19；`!!` 再套一层。
// 四档都量：单 `!`、双 `!`、`!` 在联合左边、`!` 在联合右边，另加泛型实参里的 `!`。
// xl:expect As,UnionType
// xl:round 1207
// xl:end
declare const f: any;
declare const g: (x: any) => void;
type T = any;
type U = any;
type Box<X> = X;

const q1 = f() as T!;
const q2 = f() as T!!;
const q3 = f() as T! | U;
const q4 = f() as T | U!;
const q5 = f() as Box<T!>;
const q6 = (f() as T)!;
const q7 = f() satisfies T!;
g(f() as T!);

// 明确赋值断言那一格照旧（它与类型位的 `!` 是两件事）
let d!: number;
