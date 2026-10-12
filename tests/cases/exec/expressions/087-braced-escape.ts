// xl:title `\u{…}` 花括号写法 —— **还没修**
// xl:round 382
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// 词法层把 \u{65}scaped 劈成了三格（实测产物：`Let fieldName="\u"` +
// `Bracket{65}` + `Identifier(scaped)`）。
// **边界量清了** ✗：四位 \uXXXX 那种一直是好的 ✓（变量声明 / 函数名 / 类名 / 方法名 /
// 对象键全都实测过 ✓）——只有花括号这一种写法 ✗。
// **试过两处、都没生效** ✗：`Identifier.IsAppend` 放行 `{` 与十六进制 / `}` ✓、
// `SymbolBranch` 给那几格让路 ✓——因为 `{` 那一刻 `unit.Last()` 已经不是那个 Identifier 了 ✓
// （它已经被 `Let` 收走成名字属性 ✓）。
const \u{65}scaped = 3;
console.log("A", escaped);
