// 第 183 轮：**成员名那一族**（计算键 · 字符串键 · 知名符号）。
//
// 三处都是「名字那一格没被认出来」：
//
//  ① **计算键的方法** `{ [k]() { … } }` —— 报 `ast node ComputedPropertyName has no text` ✗
//     （**整份文件进不来** ✗）。对象字面量里 `PropertyAssignment` 那条**早就认得计算键** ✓，
//     而 `MethodDeclaration` 那条按 `TextOf(name)` 取名字 ✗。修法与邻居一字不差：
//     键算成一格值、走 `set_prop` 的值键那条路。
//  ② **字符串键的方法** `{ "x-y"() { … } }` / `class C { "m-x"() { … } }` ——
//     键是字符串字面量，而投影给的名字节点 `text` **带着引号** ✗（`"x-y"` 六个字符 ✓）：
//     于是那一格存在**带引号的键**上 ✓，按 `o["x-y"]` 永远取不到 ✗（`Object.keys` 印得出来 ✓）。
//     **尺子看不见这一格** ✗——它只比 kind / 区间 / 字段名 ✓，不比字段**值** ✗。
//  ③ **`Symbol.iterator` 一类知名符号**根本不存在 ✗：`Symbol` 原来是**宿主引用** ✓，
//     宿主引用**没有属性表** ✗，挂不上任何静态那一格。这一轮把它改成**带可调用载荷的对象** ✓
//     （`Symbol("x")` 照旧走 `Op.Call` ✓、`typeof Symbol` 照旧是 `"function"` ✓），
//     再把五个知名符号**装库时各造一次** ✓（同一个符号必须永远是同一个值 ✓）。

// ① 计算键的方法（键是表达式）
const k = "dyn";
const computed: any = { [k]() { return 1; }, [k + "2"]: 2 };
console.log(computed.dyn(), computed.dyn2);

// ② 字符串键的方法（对象与类各一处）
const quoted: any = { "x-y"() { return 7; }, "a b": 8 };
console.log(quoted["x-y"](), quoted["a b"], Object.keys(quoted).join(","));

class Named {
  "m-x"() { return 3; }
  plain() { return 4; }
}
const named: any = new Named();
console.log(named["m-x"](), named.plain());

// ③ 知名符号：装库时造一次，所以同一个名字永远是同一个值
const iterable: any = { [Symbol.iterator]() { return 1; } };
console.log(
  typeof Symbol.iterator,
  iterable[Symbol.iterator]() === iterable[Symbol.iterator],
  typeof iterable[Symbol.iterator],
);
const tagged: any = { [Symbol.toStringTag]: "T" };
console.log(tagged[Symbol.toStringTag]);
console.log(Symbol("a") === Symbol("a"), typeof Symbol("a"));
