// xl:title `JSON.stringify` 会读 getter（取值一次、按读到的值序列化）
// xl:round 736
// xl:judge stdout
// xl:end
let reads = 0;
const o: any = { get a() { reads += 1; return reads; } };
console.log(JSON.stringify(o), reads);
const arr: any = [1];
Object.defineProperty(arr, "1", { get() { return "g"; }, enumerable: true, configurable: true });
console.log(JSON.stringify(arr));
