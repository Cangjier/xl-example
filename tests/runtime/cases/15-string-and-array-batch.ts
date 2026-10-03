// 语料 15：`String` 与 `Array` 的第三批（第 123 轮）——与 `node` 逐字节对拍。
//
// `startsWith` / `endsWith` 的**第二个参数含义不同**（起点 vs 结束位置），
// `substring` 的**负数夹到 0 + 起止交换**、`repeat` 的**向下取整**、
// `concat` 的**只摊平一层**与 `reverse` 的**原地改**——这一份逐条钉住。

console.log("starts", "hello".startsWith("he"), "hello".startsWith("lo"), "hello".startsWith("llo", 2));
console.log("ends", "hello".endsWith("lo"), "hello".endsWith("he"), "hello".endsWith("he", 2));
console.log("substring", "abcdef".substring(1, 3), "abcdef".substring(3, 1), "abcdef".substring(0 - 2, 2),
  "abcdef".substring(2), "abcdef".substring(9));
console.log("repeat", "ab".repeat(3), "[" + "ab".repeat(0) + "]", "ab".repeat(1), "x".repeat(5));
console.log("slice-vs-substring", "abcdef".slice(3, 1) === "" ? "empty" : "swapped");

const xs: number[] = [1, 2, 3];
const joined = xs.concat([4, 5], 6, [7]);
console.log("concat", joined.join("-"), joined.length, xs.length);
const nested = [[1], [2]];
console.log("concat-one-level", nested.concat([[3]]).length, JSON.stringify(nested.concat([[3]])));
const holed: number[] = [1, , 3];
console.log("concat-hole", holed.concat([4]).length, 1 in holed.concat([4]));

const reversed: number[] = [1, 2, 3];
const same = reversed.reverse();
console.log("reverse", reversed.join(","), same === reversed, [].reverse().length);
const reverseHoled: number[] = [1, , 3];
reverseHoled.reverse();
console.log("reverse-hole", reverseHoled.length, 0 in reverseHoled, 2 in reverseHoled);

console.log("includes", [1, 2, 3].includes(2), [1, 2, 3].includes(9), [].includes(1), ["a"].includes("a"));
console.log("isArray", Array.isArray([]), Array.isArray([1]), Array.isArray("x"), Array.isArray({}));
console.log("after", 1 + 1);
