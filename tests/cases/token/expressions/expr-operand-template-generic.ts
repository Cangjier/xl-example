// xl:note 前缀单元（`typeof` / `void` / `!` 与展开 `...`）的操作数后面**紧跟模板串或类型实参段**时，
//        那一段也是**它的操作数**（第 981 轮 · 一元与展开各补一格）。`typeof f<T>` 的 `<T>` 是实例化
//        表达式的实参段（TS：`TypeOfExpression > ExpressionWithTypeArguments`）、
//        `` ...tag`t` `` 的模板是 `SpreadElement > TaggedTemplateExpression`；
//        展开那一支还要吸收**紧跟的调用括号与 `?.`**（`` ...tag`t`() `` / `...a?.b`）——
//        后者不吸收会把 `?.b` 接到 `SpreadElement` **外面**（「展开 `a?.b`」变成「`(...a)?.b`」，**语义反了**）。
//        判据与一元那一支同一句话：`StartsWithTemplate` 问模板、`GenericType` 问实参段。
// xl:round 981
// xl:end
const a = typeof f<T>;
const b = typeof f<T>();
const c = void f<T>;
const d = !f<T>;
const e = typeof tag`t`.b;
const i = typeof f<T>`t`();
f(...tag`t`);
f(...f<T>);
f(...f<T>());
f(...tag`t`());
f(...a?.b);
f(...tag`t`.b);
f(...g(...h<T>));
