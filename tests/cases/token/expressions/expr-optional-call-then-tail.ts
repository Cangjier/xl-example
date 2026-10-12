// xl:note 第 1206 轮收掉：`?.(args)` 后面**再接一截续格**（模板串 / 点号 / 下标 / 又一次调用）时，
// 那一截**整段丢**——`chainWithOptional` 的 `?.(args)` 那一支原来算完 `CallExpression` 就 `return`
//（连区间也写成整个 `NullConditionalOperator` 的末尾）⇒ 后面那些兄弟一个都没有节点。
// 修法与 `?.[i]` 那一支同款：区间只到自己那对实参括号、剩下的兄弟交给 `chainOnto`。
// 四档都量：标签模板、点号、下标、再调一次。
// xl:end
a?.(b)`x`;
a?.(b).c;
a?.(b)[i];
a?.(b)(c);
