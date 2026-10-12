// xl:title `JSON` 的两端边界：`space` / `replacer` / `toJSON` / `reviver` / 不可序列化的值
// xl:round 766
// xl:judge stdout
// xl:note `stringify` 那一侧：`space` 给的是**换行缩进**（这里数行数，不逐字节比空白）、
// xl:note 数组版 `replacer` 是**白名单**、函数版 `replacer` 逐层调用、
// xl:note `toJSON` 优先于一切、`Map` / 函数 / `undefined` 各自的形状（对象里丢掉键、
// xl:note 数组里变成 `null`）。
// xl:note `parse` 那一侧：`reviver` 是**自底向上**的（子节点的结果会被父节点那次调用看到），
// xl:note 以及坏 JSON 抛的是 `SyntaxError`。
// xl:end
console.log("01", JSON.stringify({ a: 1, b: [1, 2] }, null, 2).split("\n").length);
console.log("02", JSON.stringify({ a: 1, b: 2 }, ["a"]));
console.log("03", JSON.stringify({ a: 1, b: 2 }, (_k: string, v: any) => (typeof v === "number" ? v * 2 : v)));
const withToJson: any = { toJSON() { return { z: 1 }; } };
console.log("04", JSON.stringify(withToJson));
console.log("05", JSON.stringify(undefined), JSON.stringify(() => 1), JSON.stringify([undefined, () => 1]));
console.log("06", JSON.stringify(new Map([["a", 1]])));
console.log("07", JSON.stringify(JSON.parse('{"a":{"b":1}}', (k: string, v: any) => (k === "b" ? 9 : v))));
try { JSON.parse("{oops}"); } catch (e) { console.log("08", (e as Error).constructor.name); }
console.log("09", JSON.parse("null"), JSON.parse("1"), JSON.parse('"s"'));
console.log("10", JSON.stringify([[1, 2], { a: [3] }]));
console.log("done");
