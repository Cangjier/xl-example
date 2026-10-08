// xl:title `JSON.parse` 的 reviver：`this` 与返回 `undefined` 删键
// xl:round 736
// xl:judge stdout
// xl:end
const out = JSON.parse('{"a":{"b":1},"c":2}', function (this: any, k: any, v: any) {
  if (k === "b") return undefined;
  if (k === "c") return v * 10;
  return v;
});
console.log(JSON.stringify(out));
const order: string[] = [];
JSON.parse('{"x":[1,2]}', function (this: any, k: any, v: any) { order.push(k); return v; });
console.log(order.join("|"));
