// xl:title `Function.prototype.apply` 认类数组（含 `length` 是数字文本 + `arguments`）
// xl:round 377
// xl:judge stdout
// xl:end
function f(this: any, a: number, b: number) { return [this.tag, a, b].join(":"); }
console.log("A", f.apply({ tag: "T" }, [1, 2]));
console.log("B", f.apply({ tag: "T" }, { length: 2, 0: 1, 1: 2 } as any));
console.log("C", f.apply({ tag: "T" }, { length: "2", 0: 1, 1: 2 } as any));
console.log("D", f.apply({ tag: "T" }, { length: 0 } as any));
console.log("E", f.apply({ tag: "T" }, { length: 5, 0: 1 } as any));
function viaArguments(): string { return f.apply({ tag: "A" }, arguments as any); }
console.log("F", viaArguments(7, 8));
console.log("G", f.apply({ tag: "T" }, [] as any), f.call({ tag: "C" }, 3, 4));
