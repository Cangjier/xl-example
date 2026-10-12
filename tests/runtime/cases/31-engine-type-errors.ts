// 语料 31：引擎抛的也是 `TypeError`（第 139 轮）——stdout 与 `node <本文件>` 逐字节对拍。
//
// **这一份的来历**：第 136 轮让「读 `null` / `undefined` 的属性」**抛** ✓、也**接得住** ✓，
// 但抛出来的是**装了工厂的那种普通错误** ✗——`e instanceof TypeError` 给 `false` ✗
// （Node 给 `true` ✓）。第 137 轮把 `TypeError` 这个类做出来了 ✓，
// 差的只剩**最后一格**：引擎报「这是哪一类失败」✗。
//
//   ① **`Guard` 与 `ErrorFactory` 各加一格 `kind`** ✓（第 139 轮）：
//      `ErrorKindGeneric = 0` ✓、`ErrorKindType = 1` ✓。
//      **引擎报的是「哪一类失败」，不是名字** ✗——`TypeError` 这几个字母是**语言层**的事 ✓，
//      引擎一旦认识它，换一门语言就得改引擎 ✓（与 `PrototypeKey` 同一条分界 ✓）。
//   ② **`tsrun` 那一行把它翻成名字** ✓：`kind === ErrorKindType` → `TypeError` ✓，
//      否则 `Error` ✓。于是引擎抛的与脚本抛的在 `catch` 里长得一样 ✓。
//
// **语料里避开的**（各自记着，不是漏测）：
//   · **话里的键名** ✗：Node 说 `Cannot read properties of null (reading 'x')` ✓，
//     本仓说 `cannot read properties of null` ✓——要带上键名，得把**那个键值**递给工厂 ✓
//     （工厂是语言层 ✓，它认得 `TextFrom` ✓；而引擎侧不许把值渲染成文本 ✗，
//      见 `host-text.xl.md` 的纪律 ✓）。这是**另一轮**的事 ✓，语料里不打印 message ✓。
//   · **`x` 不是函数却调用它** ✗：JS 也是 `TypeError` ✓，但本仓那一抛走的是**指令那一层**的
//     `Guard` ✓（一处包住整条指令 ✓），分不出「类型失败」与「别的失败」✗——
//     要分就得让 `DoCallValue` 自己带类别 ✓，是下一轮的第一条 ✓。
//   · **未声明的名字**：本仓在**降级期**就报「name is not a local or a capture」✗，
//     Node 是运行期 `ReferenceError` ✓——这是**另一条**记着的账 ✓（`GlobalNames` 那条路 ✓）。

console.log("null-member", (() => {
  try {
    const empty = null;
    return empty.member;
  } catch (error) {
    return [error instanceof TypeError, error instanceof Error, error.name].join(",");
  }
})());
console.log("undefined-index", (() => {
  try {
    const missing = undefined;
    return missing[0];
  } catch (error) {
    return [error instanceof TypeError, error.message.length > 0].join(",");
  }
})());
console.log("kind-dispatch", (() => {
  const seen = [];
  try {
    throw new TypeError("script-typed");
  } catch (error) {
    seen.push(error instanceof TypeError ? "type" : "other");
  }
  try {
    throw new Error("script-generic");
  } catch (error) {
    seen.push(error instanceof TypeError ? "type" : "generic");
  }
  try {
    const nothing = null;
    seen.push(nothing.value);
  } catch (error) {
    seen.push(error instanceof TypeError ? "type" : "generic");
  }
  return seen.join(",");
})());
console.log("kind-not-constructor", new Error("x") instanceof TypeError,
  new TypeError("y") instanceof Error, TypeError.prototype instanceof Error);
console.log("after", 1 + 1);
