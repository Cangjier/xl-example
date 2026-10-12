// xl:title 符号协议与 `Reflect`：`Symbol.toPrimitive` / `hasInstance` / `Reflect` 的返回值
// xl:round 766
// xl:judge stdout
// xl:note 三条协议一起钉：`Symbol.toPrimitive` 拿到的 `hint` 是哪一档
// xl:note （`+o` 是 `"number"`、`o + ""` 是 `"default"`、`String(o)` 是 `"string"`）、
// xl:note `Symbol.hasInstance` 覆写 `instanceof`、以及 `Symbol.species` 在不在。
// xl:note `Reflect` 那一族钉的是**返回值**（`set` / `deleteProperty` 给布尔、
// xl:note `apply` / `construct` 直接给结果、`ownKeys` 给名字）——它**从不抛**。
// xl:end
const hinted: any = { [Symbol.toPrimitive](hint: string) { return hint; } };
console.log("01", +hinted, hinted + "", String(hinted));
const alwaysSeven: any = { [Symbol.toPrimitive]() { return 7; } };
console.log("02", alwaysSeven * 2, `${alwaysSeven}`, Number(alwaysSeven));
class OnlyOne { static [Symbol.hasInstance](x: any) { return x === 1; } }
console.log("03", 1 instanceof OnlyOne, 2 instanceof OnlyOne);
console.log("04", typeof (Array as any)[Symbol.species], typeof (Array.prototype as any)[Symbol.iterator], typeof (Symbol as any).asyncIterator);
const t: any = {};
console.log("05", Reflect.set(t, "a", 1), t.a, Reflect.has(t, "a"));
console.log("06", Reflect.deleteProperty(t, "a"), "a" in t, Reflect.ownKeys({ a: 1 }).join(","));
console.log("07", Reflect.get({ a: 1 }, "a"), Reflect.getOwnPropertyDescriptor({ a: 1 }, "a")!.value);
console.log("08", Reflect.apply(Math.max, null, [1, 5, 2]), Reflect.construct(Date, [0]) instanceof Date);
console.log("done");
