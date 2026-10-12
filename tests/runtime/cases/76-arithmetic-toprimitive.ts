// 第 198 轮：**算术与比较的 `ToPrimitive` / `ToNumber`**。
//
// 这一格是**第 197 轮写语料时自己撞出来的**（普查里本来没收）：
// `undefined + 1` 报 `arithmetic on a non-numeric operand`——而 JS 给 `NaN`。
// 逐条量过之后发现是**一整片**：`null + 1` / `true + 1` / `f + 1` / `[] + 1` /
// `[1] + 1` / `({}) + 1` / 带 `valueOf` 的对象 / `1 - "2"` / `2 * "3"` / `"6" / "2"`
// **全部**报同一句话；而 `"a" + 1` 那条走的是 `StringConcat`，本来是好的。
//
// 根因：`+` 的定义**不是**「两边都是数就加」，而是三步——
// ① 两边 `ToPrimitive`（hint `default`）→ ② 有一边是字符串就拼接 → ③ 否则两边 `ToNumber` 相加。
// 本仓原来只有「①之后已经是字符串」与「两边已经是数」两档，其余一律抛。
// `- * / %` 与一元 `-` 同样要 `ToNumber`，`==` 同样要 `ToPrimitive`，一起补齐。
//
// 一并补上的还有两个**标准库**的洞（都是 `Object.prototype` 上那一族）：
// `valueOf`（返回接收者自己）与 `toString`（普通对象给 `[object Object]`）。
//
// **两条留在明处的缺口**（都**响亮地抛**，绝不落回一个看起来合理的默认值）：
// ① 函数的 `ToPrimitive`——JS 给**源码文本**（`f + 1` 是 `"function f() {}1"`），
//    那一份引擎拿不到；
// ② `Date` 的 hint `default`——第 616 轮起**有答案了** ✓：`Date.prototype.toString`
//    补上了合法日期那一档（按 UTC 渲染，本仓的本地口径就是 UTC ⇒ `String(d)` 与
//    `d.getHours()` 自洽；与 Node 的差别只剩时区那一截）。
//    **`+new Date(ms)` 不受影响**（hint 是 `number`，走 `valueOf`）。

console.log(undefined + 1, undefined - 1, undefined * 2);
console.log(null + 1, null - 1, true + 1, false - 1);

const s: any = "12";
console.log(s + 1, s - 1, s * 2, s / 4, s % 5);
console.log(1 - "2", 2 * "3", "6" / "2", -"3", +"4.5");
console.log(+undefined, +null, +true, +"", +"  ");

console.log([1] + 1, [] + 1, [] + [], [1, 2] + "", [1, 2] + [3]);
console.log(-[5], +[7], +[], +[1, 2]);

const withValueOf: any = { valueOf() { return 5; } };
console.log(withValueOf + 1, withValueOf - 1, withValueOf * 2);
console.log(withValueOf == 5, withValueOf < 6);

console.log(({}) + 1, ({}).toString(), ({}).valueOf() !== undefined);
console.log("" + {}, Object.keys({}).length, JSON.stringify({}));

console.log(1 == "1", "1" == 1, 0 == false, [] == 0, [] == false, [1, 2] == "1,2");
console.log(null == undefined, null == 0, undefined == 0, "abc" == 0, NaN == NaN, 1 == 1.0);

console.log(+new Date(1234), new Date(1234).getTime(), +new Date(1234) === 1234);

// **四条关系也走同一套**（第 198 轮）：两边先 `ToPrimitive`（hint `number`），
// 再「两边都是字符串就按码元比、否则按数值比」——`date1 < date2` 靠的就是第一句。
console.log(new Date(1) < new Date(2), new Date(5) >= new Date(5), new Date(9) <= new Date(3));
console.log([1, 2] < "b", "10" < 9, "10" < "9", "a" < "b", "ab" < "abc");
console.log(undefined < 1, NaN <= 1, null < 1, null >= 0, "" < 1);

const mixed: any = [undefined, null, true, "7", []];
const sums: number[] = [];
for (const item of mixed) {
  sums.push(+item);
}
console.log(sums.join(","));
