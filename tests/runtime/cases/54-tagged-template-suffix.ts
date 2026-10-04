// 第 176 轮：**标签模板当接收者 / 处在运算符左脊柱上**。
//
// 第 171 轮把 `` tag`a${x}b` `` 这一格做通了（降级成一次普通调用 `tag(parts, x)`），
// 但**标签与模板串在 token 树里是两格平级单元**这件事实带来了第二族形状：
//
//   · `` tag`abc`.length ``       产物 `[Identifier(tag), PropertyAccess(String, ., length)]`
//   · `` tag`abc` + 1 ``          产物 `[Identifier(tag), BinaryOperator(String, +, 1)]`
//   · `` tag`abc`.length + 1 + 2 `` 产物 `[Identifier(tag), BinaryOperator(BinaryOperator(…), +, 2)]`
//
// ——**标签留在外面，模板串被后面的单元吃掉了**。投影的通用支只投第一格 `kids[0]`，
// 于是整条标签模板与后缀一起丢：运行时拿到的是**函数本身**（`[Function (anonymous)]`），
// 不是它返回的字符串。这是**静默错值**：不抛、不报，只是算错。
//
// 修法在投影（`print-ast-common.xl.md` 的 0c / 0d 两支）：认出「第二格/左脊柱上装着
// 反引号 `String`」这一形状，把标签模板拼出来，后缀交给既有的 `chainOnto`、
// 运算符交给既有的 `foldBinaryFrom`——两段都是别处已经在用的代码。
//
// **还没做的那一族**（记在台账里，最小反例就在这里）：
//   · `1 + tag`abc`.length` —— 模板单元**跟在运算符单元后面**，标签是那个运算符的
//     **最后一个操作数**；`typeof tag`abc`.length` 同形（本仓给 `"function"`，Node 给 `"number"`）。

function tag(parts: any, ...values: any[]): string {
  return parts.join("|") + "#" + values.join(",") + "(" + parts.length + ")";
}
const obj = { tag };
const n = 3;

// ① 后缀：成员 / 下标 / 调用
console.log(tag`abc`.length);
console.log(tag`a${n}b`.length);
console.log(tag`abc`[0]);
console.log(tag`abc`.toUpperCase());
console.log(obj.tag`abc`.length);

// ② 括号里的标签表达式也是标签
console.log((true ? tag : tag)`xy`.length);

// ③ 运算符：模板串是左脊柱上的第一格
console.log(tag`abc` + 1);
console.log(tag`abc`.length + 1);
console.log(tag`abc`.length + 1 + 2);
console.log(tag`a${n}b` === tag`a${n}b`);

// ④ 与不带后缀的那些混在一句里（0b 那一条不能被我抢走）
console.log(tag`plain`, tag`plain`.length, `${tag`plain`}`);
