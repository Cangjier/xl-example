// xl:note 第 1222 轮新立：`a<b>?.[0]` / `a<b>?.(1)` 那一族（实例化表达式后面紧跟一条 `?.` 链）
// 原来**整格丢**。产物是 `[Identifier(a), GenericType(<b>), NullConditionalOperator(…)]` 三格，
// 而投影 0a 那一支只看前两格，尾巴那一格落到 `foldBinaryFrom` 手上——它开头一句就要求
// `rest` 以运算符打头（`rest[0].IsOperatorUnit` 答否就原样返回 `left`），
// 于是投出来只有一条 `ExpressionWithTypeArguments`；TS 那边是
// `ElementAccessExpression > [ExpressionWithTypeArguments, QuestionDotToken, …]`。
// 补法：这一支认出尾巴第一格是 `?.` 链时，交给链那一支**同一份实现** `chainWithOptional`
// （剩下的兄弟再交给 `foldBinaryFrom`）——不新写折法，只是把这一格递对了地方。
// 十六种续写同根：`?.[0]` / `?.(1)` 各带 `.b` / `[0]` / `(1)` / 反引号 / `!` / `as T` / `satisfies T`。
// xl:end
declare const a: any, b: any;

a<b>?.[0];
a<b>?.[0].b;
a<b>?.[0][0];
a<b>?.[0](1);
a<b>?.[0]`t`;
a<b>?.[0]!;
a<b>?.[0] as any;
a<b>?.[0] satisfies any;
a<b>?.(1);
a<b>?.(1).b;
a<b>?.(1)[0];
a<b>?.(1)(1);
a<b>?.(1)`t`;
a<b>?.(1)!;
a<b>?.(1) as any;
a<b>?.(1) satisfies any;
