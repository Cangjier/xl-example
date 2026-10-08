// xl:title Object.assign：读源上的 getter、写目标上的 setter、键的顺序
// xl:round 371
// xl:judge stdout
// xl:end
const src: any = {};
Object.defineProperty(src, "g", { get() { return 7; }, enumerable: true });
const target: any = { a: 1 };
Object.assign(target, src, { b: 2 });
console.log(JSON.stringify(target));
const writes: string[] = [];
const sink: any = {};
Object.defineProperty(sink, "s", { set(v: unknown) { writes.push("set:" + v); }, enumerable: true });
Object.assign(sink, { s: 9 });
console.log(writes.join(","));
