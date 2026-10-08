// xl:title `JSON.stringify` 会读 getter（取值一次、按读到的值序列化）
// xl:round 736
// xl:judge stdout
// xl:want differ
// xl:why **`JSON.stringify` 看不见元素区上的访问器**（静默少了一格）：
// xl:why `Object.defineProperty(arr, "1", { get })` 之后 `JSON.stringify(arr)` 在 Node 里给
// xl:why `[1,"g"]`，本仓给 `[1]`（那一格压根没进结果）。
// xl:why 它是第 721 / 722 轮那条总根（**下标上的访问器调不到**：`get_index` / `set_index`
// xl:why 两条快路径的签名里没有调用通道）的一个落点——序列化那一趟也走元素区直读。
// xl:why **收它要先把调用通道递进元素区那三十来处读法**（与 `p721a-b01` 同一条根），
// xl:why 本轮只把它量出来、登在这里，不与总根分开修。
// xl:end
let reads = 0;
const o: any = { get a() { reads += 1; return reads; } };
console.log(JSON.stringify(o), reads);
const arr: any = [1];
Object.defineProperty(arr, "1", { get() { return "g"; }, enumerable: true, configurable: true });
console.log(JSON.stringify(arr));
