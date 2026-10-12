// xl:title 循环引用的对象 `JSON.stringify` 该抛 TypeError
// xl:round 305
// xl:judge stdout
// xl:end

const o: any = { a: 1 };
o.self = o;
try {
  JSON.stringify(o);
  console.log("no throw");
} catch (e) {
  console.log("threw", (e as Error).name);
}
