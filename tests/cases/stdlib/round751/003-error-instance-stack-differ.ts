// xl:title `Error` 实例的 `stack`
// xl:round 751
// xl:judge stdout
// xl:want differ
// xl:why **`Error` 实例没有 `stack` 那一格**（Node 给 `"Error: x\n    at …"` 那样的字符串，本仓给 `undefined`）。
// xl:why **与第 697 / 704 / 708 / 749 轮登记的是同一条根**——这里把它钉在**最普通的那句读法**上
// xl:why （`new Error('x').stack`），并把 `typeof` 那半一起量（免得只对了一半）。
// xl:why **为什么一直没做**：JS 的 `stack` 是**引擎的**（V8 的栈帧格式，规范里一个字都没有）——
// xl:why 本仓要造它就得自己维护一份**帧栈快照**，那不是「补一格属性」的事。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log("new Error('x').stack", show(() => new Error('x').stack));
console.log("typeof new Error('x').stac", show(() => typeof new Error('x').stack));
