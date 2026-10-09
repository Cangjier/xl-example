// xl:title `Array.prototype.*.call`：通用方法对类数组 / 字符串 / 原始值的落法
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的四十余条**（这一族是「通用方法」那一条最集中的重抄）：
//   probe2-g01 · probe2-g02 · probe2-g03 · probe2-g04 · probe2-g05 · probe2-g06 ·
//   probe2-g07 · probe2-g08 · probe2-g09 · probe2-g10 · probe2-g11 · probe2-g12 ·
//   probe2-g13 · probe2-g14 · probe2-g15 · probe696-r01 · probe696-r02 · probe696-r03 ·
//   probe696-r04 · probe696-r05 · probe696-r06 · probe696-r08 · probe696-r09 ·
//   probe696-r10 · probe696-r11 · probe696-r12 · probe696-r13 · probe696-r14 ·
//   probe696-r15 · probe696-r16 · probe696-r17 · probe696-r25 · probe696-r26 ·
//   probe696-r27 · probe696-r30 · probe696-r31 · probe696-r33 · probe696-r34 ·
//   probe696-r35 · probe696-r36 · probe696-r37 · probe696-r38 · probe696-r39 ·
//   probe696-r40 · probe696-r41 · probe696-r42 · probe696-r43 · probe696-r44 ·
//   probe696-r45 · probe696-r46 · probe704-a-f04 · probe704-a-f05 · probe704-a-f06
//   ＋ `085-function-apply-array-like` / `151-array-from-arguments`
//
// 判定点只有一个：**`this` 只要「有 `length` 就能当数组用」**——
//  ① 类数组对象（`{ length: n, 0: …, 1: … }`）走 `map` / `filter` / `slice` / `join` /
//     `indexOf` / `reduce` / `reduceRight` / `some` / `every` / `find` / `findIndex` /
//     `findLastIndex` / `includes` / `at` / `flat` / `flatMap` / `keys` / `values` / `entries`；
//  ② 缺的格按**洞**处理（`map` 输出里留洞、`filter` 跳过、`indexOf` 跳过、
//     `includes` 算 `undefined`、`find` 认 `undefined`）；
//  ③ 字符串当类数组（按**码元**，`slice.call("abc")` 给三个字符）；
//  ④ `null` / `undefined` 当 `this` 抛 `TypeError`，原始值先 `ToObject`（长度 0）；
//  ⑤ 回调的第三个实参就是**那个类数组自己**（不是新造的数组）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const err = (f: () => any): string => {
  try { return "no-throw:" + String(f()); } catch (e) { return (e as any).constructor.name; }
};
const A: any = Array.prototype;
const like: any = { length: 2, 0: "a", 1: "b" };

try {
  console.log(show(A.slice.call(like).join(",")));
  console.log(show(A.map.call(like, (x: any) => x + "!").join("|")));
  console.log(show(A.filter.call({ length: 3, 0: 1, 1: 2, 2: 3 }, (x: any) => x > 1).join(",")));
  console.log(show(A.join.call(like, "-")));
  console.log(show(A.indexOf.call(like, "b")));
  console.log(show(A.lastIndexOf.call({ length: 2, 0: 1, 1: 1 }, 1)));
  console.log(show(A.includes.call(like, "b")));
  console.log(show(A.reduce.call({ length: 3, 0: 1, 1: 2, 2: 3 }, (a: any, b: any) => a + b)));
  console.log(show(A.reduceRight.call({ length: 3, 0: "a", 1: "b", 2: "c" }, (a: any, b: any) => a + b)));
  console.log(show(A.some.call({ length: 2, 0: 1, 1: 2 }, (x: any) => x > 1)));
  console.log(show(A.every.call({ length: 2, 0: 1, 1: 2 }, (x: any) => x > 0)));
  console.log(show(A.find.call({ length: 2, 0: 1, 1: 2 }, (x: any) => x > 1)));
  console.log(show(A.findIndex.call({ length: 2, 0: 1, 1: 2 }, (x: any) => x > 1)));
  console.log(show(A.findLastIndex.call({ length: 2, 0: 1 }, (v: any) => v === 1)));
  console.log(show(A.at.call({ length: 3, 0: "a", 1: "b", 2: "c" }, -1)));
  console.log(show(A.flat.call({ length: 2, 0: [1], 1: [2] }).join(",")));
  console.log(show(A.flatMap.call({ length: 2, 0: 1, 1: 2 }, (x: any) => [x, x]).join(",")));
  console.log(show([...A.keys.call({ length: 2 })].join(",")));
  console.log(show([...A.values.call({ length: 2, 0: "a", 1: "b" })].join(",")));
  console.log(show([...A.entries.call({ length: 1, 0: "a" })].map((e: any) => e.join(":")).join(",")));
  console.log(show(A.toReversed.call({ length: 2, 0: 1, 1: 2 }).join(",")));
  console.log(show(A.toSorted.call({ length: 2, 0: 2, 1: 1 }).join(",")));
  console.log(show(A.with.call({ length: 2, 0: 1, 1: 2 }, 0, 9).join(",")));
  console.log(show(A.toSpliced.call({ length: 3, 0: 1, 1: 2, 2: 3 }, 1, 1).join(",")));
  console.log(show(err(() => A.sort.call({ length: 3, 0: 3, 1: 1, 2: 2 }).join(","))));
  console.log(show(err(() => A.reverse.call({ length: 2, 0: 1, 1: 2 }).join(","))));
  console.log(show(A.slice.call("abc").join(",")));
  console.log(show(A.slice.call("abc").length));
  console.log(show(A.slice.call("").length));
  console.log(show(A.indexOf.call("abc", "b")));
  console.log(show(A.join.call("abc", "-")));
  console.log(show(String(A.indexOf.call("abc", "z"))));
  console.log(show(A.slice.call([1, 2, 3], -2).join(",")));
  console.log(show(A.slice.call([1, 2, 3], 1).join(",")));
  console.log(show(A.concat.call([1], [2], 3).join(",")));
  console.log(show(A.map.call("ab", (v: any, i: any) => v + i).join(",")));
  // ② 缺格按洞
  console.log(show(A.map.call({ length: 2 }, () => 1).length));
  console.log(show(A.map.call({ length: 2, 0: "a" }, (v: any) => String(v)).join("|")));
  console.log(show(JSON.stringify(A.map.call({ length: 2 }, (v: any) => v))));
  console.log(show(A.indexOf.call({ length: 2 }, undefined)));
  console.log(show(A.includes.call({ length: 2 }, undefined)));
  console.log(show(A.find.call({ length: 2 }, (v: any) => v === undefined)));
  console.log(show(A.join.call({ length: 2, 0: "a" })));
  console.log(show(A.reduce.call({ length: 2 }, (a: any, b: any) => a + b, 0)));
  console.log(show(A.slice.call({ length: 2, 0: "a" }).length));
  // ③ 回调的第三个实参是它自己
  const o: any = { length: 2, 0: 1, 1: 2 };
  console.log(show(A.map.call(o, (v: any, i: any, arr: any) => arr === o).join(",")));
  console.log(show(A.reduce.call(o, (a: any, v: any, i: any, arr: any) => String(arr === o), "")));
  console.log(show(A.filter.call({ length: 1, 0: 1 }, (v: any, i: any, arr: any) => arr === undefined ? "?" : true).length));
  // ④ 空 / 原始值当 this
  console.log(show(A.every.call({ length: 0 }, () => false)));
  console.log(show(A.map.call(42, (v: any) => v).length));
  console.log(show(A.map.call(true, (v: any) => v).length));
  console.log(show(err(() => A.forEach.call(undefined, (v: any) => v))));
  console.log(show(err(() => A.map.call(null, (v: any) => v))));
  console.log(show(err(() => A.reduce.call({ length: 0 }, (a: any, b: any) => a))));
  console.log(show(A.forEach.call({ length: 2 }, () => { throw new Error("x"); }) === undefined ? "done" : "?"));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
