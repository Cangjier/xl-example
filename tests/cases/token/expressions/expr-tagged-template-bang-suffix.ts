// xl:note 模板后面那个 `!` 被读成了**前缀一元单元**（第 1217 轮，用户口径 1.1）：`` a`x`!(d) `` 的产物是
// `[Identifier(a), String(反引号), UnaryOperator(op="!", [SymbolToken(!), Bracket((d))])]`，而 TS 那边是
// `CallExpression > [NonNullExpression > TaggedTemplateExpression, (d)]` —— `!` 是**标签模板的后缀断言**
//（`` `x` !(d) `` 与 `` `x`!(d) `` 在 TS 里同形，带不带空白一样），后面那一格才是它的**续格**。
// 三条路（0b 的 `IsChainTail` / 0c 的「装着模板的 PropertyAccess」/ 0d 的运算符左脊柱）都接不住。
// 补一档 0c-1：前缀形态 `[SymbolToken(!), 续格]` 与「`!` 收进一元单元当第二格」两种形状各一趟
//（后者剩下的那个裸 `!` 由 `chainOnto` 的「一格裸 `!`」接上）。
// xl:expect String,PropertyAccess,Identifier,NotNull,Method,Bracket
const a1 = a`x`!(d);
const a2 = f()`x`!(d);
const a3 = a["b"]`x`!(d);
const a4 = a.b`x`!(d);
const a5 = this`x`!(d);
const a6 = (a)`x`!(d);
const a7 = a`x`!?.[c];
const a8 = a`x`!!;
const a9 = a`x`!(d).b;
const a10 = a`x`!;
