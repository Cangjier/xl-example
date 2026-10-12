// xl:title `JSON.stringify` 的钩子与值过滤：replacer 数组 / 函数、`space`、`toJSON`、`undefined` 与 getter
// xl:round 736
// xl:judge stdout
// xl:end
// **按判定点并组（第 803 轮）**：吸收同域六条原子探针 `p736b-b01` · `b02` · `b03` · `b04` ·
// `b06`（这一条是 `JSON.parse` 的 reviver，与 `stringify` 同一对钩子）· `b08`，
// 正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**序列化与反序列化那两个钩子怎么走**——`replacer` 数组只留列出的键、
// `replacer` 函数与 `toJSON` 的次序、`space` 的几种形态、`undefined` / 函数 / 符号怎么被丢掉、
// 序列化会**读 getter**（读一次、按读到的值写），以及 `reviver` 的 `this` 与「返回 `undefined` 删键」。
{
  // b01 · `JSON.stringify` 的 replacer **数组**（键过滤与次序）
  const o = { a: 1, b: 2, c: 3 };
  console.log(JSON.stringify(o, ["c", "a"] as any));
  console.log(JSON.stringify(o, [] as any));
  console.log(JSON.stringify([1, 2], ["0"] as any));
}

{
  // b02 · `JSON.stringify` 的 replacer 函数与 `toJSON` 的次序
  const o: any = { a: 1, toJSON() { return { a: 10 }; } };
  console.log(JSON.stringify(o, (k: any, v: any) => (k === "a" ? 99 : v)));
  const seen: string[] = [];
  JSON.stringify({ x: { y: 1 } }, function (this: any, k: any, v: any) { seen.push(k + ":" + typeof v); return v; });
  console.log(seen.join("|"));
}

{
  // b03 · `JSON.stringify` 的 `space`（数字 / 字符串 / 越界 / 负数）
  console.log(JSON.stringify({ a: [1] }, null, 2));
  console.log(JSON.stringify({ a: 1 }, null, "ab"));
  console.log(JSON.stringify({ a: 1 }, null, 20).length);
  console.log(JSON.stringify({ a: 1 }, null, -1), JSON.stringify({ a: 1 }, null, 0));
}

{
  // b04 · `JSON.stringify` 里的 `undefined` / 函数 / 符号
  console.log(JSON.stringify({ a: undefined, b: function () {}, c: 1 }));
  console.log(JSON.stringify([undefined, function () {}, 1]));
  const o: any = { a: 1 };
  o[Symbol("s")] = 2;
  console.log(JSON.stringify(o));
  console.log(JSON.stringify(undefined), JSON.stringify(function () {}));
}

{
  // b06 · `JSON.parse` 的 reviver：`this` 与返回 `undefined` 删键
  const out = JSON.parse('{"a":{"b":1},"c":2}', function (this: any, k: any, v: any) {
    if (k === "b") return undefined;
    if (k === "c") return v * 10;
    return v;
  });
  console.log(JSON.stringify(out));
  const order: string[] = [];
  JSON.parse('{"x":[1,2]}', function (this: any, k: any, v: any) { order.push(k); return v; });
  console.log(order.join("|"));
}

{
  // b08 · `JSON.stringify` 会读 getter（取值一次、按读到的值序列化）
  let reads = 0;
  const o: any = { get a() { reads += 1; return reads; } };
  console.log(JSON.stringify(o), reads);
  const arr: any = [1];
  Object.defineProperty(arr, "1", { get() { return "g"; }, enumerable: true, configurable: true });
  console.log(JSON.stringify(arr));
}
