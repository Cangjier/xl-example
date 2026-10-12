// xl:note 第 1209 轮收掉：标签模板的标签是**一格 `NotNull` 或 `?.` 链**（`a!`x`` / `a!`x`!`）。
// 投影层有两张「这一格能不能接在操作数后面」的名单——标签那一张（`tagIsPostfixChain`）
// 与尾巴那一张（`IsChainTail`）——它们本来就该一样，可标签那一张少了 `NotNull` 与
// `NullConditionalOperator` 两格：`a!`x`` 的标签是**一格 `NotNull`**，于是入口那一问答否、
// 整条标签模板让开（`ts.createSourceFile` 实测 `const q = a!`x``：
// `TaggedTemplateExpression[10,15) > [NonNullExpression[10,12), NoSubstitutionTemplateLiteral[12,15)]`）。
// 这一条钉的是「标签是一格 `NotNull`」这一档，另加五档邻近形状当守卫。
// xl:round 1209
// xl:end
declare const a: any;
declare const b: any;

const q1 = a!`x`;
const q2 = a!`x`!;
const q3 = a`x`.b;
const q4 = a`x`.b(a);
const q5 = a`x`(b);
const q6 = a`x`.b.c;
