// xl:note 第 1229 轮新立：**正则字面量与 `new.target` / `import.meta` 当标签模板的标签**那一族
//（ `/re/g`t`` / `new.target`t`` / `import.meta`t`` 以及各自后面接 `.d` / `()` / `!` / 下标 /
//  又一个模板的续写）。
// 根因有**两处**，都是「这一格能不能当标签」这一问上少了一格或早了一步：
//   ① `/re/g`t``：`tagIsPostfixChain`（`print-ast-common.xl.md` 第 0b 那一支）的名单里
//      没有正则那一页 ⇒ 入口判否；那一页补 `## field IsTagBaseNode:bool = true`
//      （判据与 `New` 那一页第 1221 轮补的那一格同源）。
//   ② `new.target`t`` / `import.meta`t``：标签在 token 层是**三格平铺**
//      （`cjcli` 实测 `<Keyword>new</Keyword><SymbolToken>.</SymbolToken><Identifier>target</Identifier>`），
//      头一个词那一格由 `Keyword` 认——那一页第 1208 轮只为 `this` 答是，这一轮补 `new` / `import`；
//      可光补名单还不够：`projectExpression` 的**第 0 支**（专门认 `import.meta` / `new.target`）
//      排在 0b **前面**，它原来把后面那一格模板串当**二元尾巴**交给 `foldBinaryFrom`
//      ⇒ 那一支现在在「后面紧跟一格模板串」时整支让开，交给 0b（`TaggedTemplateExpression`
//      只有 0b 一处搭法）。
// 实测：`tmp/r1229-tag.mjs` 那 24 条 9 对上 / 12 对不上 → **15 对上 / 6 对不上**；
// `tmp/r1227-tag.mjs` 那 824 条 对不上的**底样 7 → 4、条数 49 → 25**
//（剩下四个底样是 `function () {}`t`` / `class {}`t`` 两条语句位当标签的老缺口与 `<T>a`t`` 的区间）。
// xl:round 1229
// xl:end
declare const a: any, b: any, c: any, d: any, o: any;

/re/g`t`;
/ab+c/gi`t`;
/re/g`t`.d;
/re/g`t`();
/re/g`t`!;
/re/g`t`[0];
/re/g`t``u`;
new.target`t`;
import.meta`t`;
new.target`t`.d;
import.meta`t`.d;
new.target`t`();
import.meta`t`();
new.target`t`!;
import.meta`t`!;
new.target`t`[0];
import.meta`t`[0];
new.target`t``u`;
import.meta`t``u`;
new.target`t` as any;
import.meta`t` as any;
const q1 = /re/g`t`;
const q2 = import.meta`t`;
function g() { return new.target`t`; }
class Z { p = /re/g`t`; }
o.m(/re/g`t`, import.meta`t`);
