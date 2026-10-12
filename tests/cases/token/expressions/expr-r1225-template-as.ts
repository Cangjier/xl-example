// xl:note 第 1225 轮新立：模板那条链后面跟 `as` / `satisfies` 时，那一格原来**整格丢**
// （`a!`t`[0]as T` 的产物是 `[NotNull(a!), PropertyAccess([String(反引号), Bracket([0])]), As(T)]`，
// 而 0c 那一支把尾巴无条件交给 `foldBinaryFrom`——它要求 `rest` 以运算符打头 ⇒ `As` 丢）。
// 与第 664 轮 `asAfterNco`、第 1220 轮 `asAfterInst` 同一条口径：尾巴里有 `As` / `Satisfies`
// 时这一支让开，落到主流程第 2 节（`As` / `Satisfies` 的折法只有那一份）。
// 另一档的形状换了事实没换：`a!`t`!as T` 的产物里 `As` **装在那一格 `UnaryOperator` 里面**
// （`[NotNull, String, UnaryOperator(op="!", [SymbolToken(!), As(T)])]`），0c-1 那一支把它
// 当链的续格交给 `chainOnto` ⇒ 同样丢——那里改成**把那一格拆平再交回本函数**（让开会连
// 标签模板一起丢，实测过）。
// xl:end
declare const a: any, b: any, f: any, C: any;
interface T {}

a!`t`[0]as T;
a!`t`[0]satisfies T;
a!`t`!as T;
a!`t`!satisfies T;
a!`t`as T;
a!`t`satisfies T;
a`t` as T;
a`t` satisfies T;
a.b`t` as T;
f()`t` as T;
a[0]`t` as T;
this`t` as T;
a!`t`.b as T;
a!`t`[0].b as T;
a!`t`!(1) as T;
a!`t`!`t` as T;
a!`t` as T as U;
a!`t`[0] as T | U;
new C()`t` as T;
(a)`t` as T;
const x = a!`t`[0]as T;
f(a!`t`!as T);
