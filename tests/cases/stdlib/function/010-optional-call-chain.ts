// xl:title 可选链的三档（属性 / 下标 / 调用）与空值合并
// xl:round 623
// xl:judge stdout
// xl:end

const o: any = { a: { b: () => 1 }, m: null };
console.log(o?.a?.b?.(), o?.m?.[0] ?? "d", o?.z?.y ?? "e");
console.log(o.a?.b?.(), (null as any)?.x);
