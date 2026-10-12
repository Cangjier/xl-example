// xl:title 断言函数：asserts x is string
// xl:judge stdout
// xl:end

function assertIsString(x: unknown): asserts x is string {
  if (typeof x !== "string") throw new Error("not a string");
}
const v: unknown = "hi";
assertIsString(v);
console.log(v.length);
try {
  assertIsString(1 as unknown);
} catch (e) {
  console.log((e as Error).message);
}
