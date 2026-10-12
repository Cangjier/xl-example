// xl:note 第 1221 轮新立：`new C()`t`` 那一族（标签模板的标签是一格 `New`）原来**模板整格丢**。
// 产物是 `[New, String(反引号)]` 两格平级，而投影 0b 那一支的入口（`tagIsPostfixChain`）
// 名单里没有 `New` ⇒ 整个让开 ⇒ 通用支只投得出一格 `NewExpression`。
// TS 那边是 `TaggedTemplateExpression{ tag: NewExpression, template }`——标签就是一格完整的 `New`。
// 补法是让 `New` 自己答这一问（`## field IsTagBaseNode:bool = true`，与 `keyword.xl.md`
// 为 `this` 立的那一格同一口径）：清单里本来就有 `one.IsTagBaseNode === true` 这一档，
// 缺的只是**被问的那一页自己声明**。十二种续写（`.b` / `[0]` / `(1)` / `!` / `?.b` / `?.[0]` /
// `?.(1)` / `as T` / `satisfies T` / 再标一次模板 / `new C()(1)`t``）同根，一格全收。
// xl:end
declare const C: any;

new C()`t`;
new C()`t`.b;
new C()`t`[0];
new C()`t`(1);
new C()`t`!;
new C()`t`?.b;
new C()`t`?.[0];
new C()`t`?.(1);
new C()`t` as any;
new C()`t` satisfies any;
new C()`t``t`;
new C()(1)`t`;
