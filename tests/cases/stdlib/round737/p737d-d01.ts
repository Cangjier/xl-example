// xl:title `WeakMap.prototype` 只有五格、`WeakSet.prototype` 只有四格（多一格都不行）
// xl:round 737
// xl:judge stdout
// xl:end
const wmProto: any = Object.getPrototypeOf(new WeakMap());
const wsProto: any = Object.getPrototypeOf(new WeakSet());
const names = (o: any) => Object.getOwnPropertyNames(o).sort().join(",");
console.log("wm", names(wmProto));
console.log("ws", names(wsProto));
console.log("wm-absent", ["keys", "values", "entries", "clear", "forEach", "size"].map((n) => typeof wmProto[n]).join(","));
console.log("ws-absent", ["keys", "values", "entries", "clear", "forEach", "size", "get"].map((n) => typeof wsProto[n]).join(","));
console.log("wm-has", typeof wmProto.set, typeof new WeakMap().set, Object.getPrototypeOf(wmProto) === Object.prototype);
