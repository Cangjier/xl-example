// 第 143 轮：`?.` 写在**实参位**（`f(o?.a)`）。
//
// 产物原来一看「`Method` 的子单元里有 `NullConditionalOperator`」就折链，
// 于是 `console.log(o?.a)` 被折成 `o?.a` —— **整个调用没了**，
// 那一行什么都不打印，退出码还是 0（**静默少一整句**）。
// 判据是「第一个子单元就是方法名自己」：被调用者自带 `?.` 时它就在子单元里
//（`x?.y?.(1)` 的 `Identifier(x)`），而实参位的第一个子单元是**实参**。
//
// 覆盖：实参位的 `?.`、混在其它实参之间、被调用者自己也带 `?.`、两层链。

const o: any = { a: 1, b: { c: 2 } };
const nil: any = null;

console.log(o?.a);
console.log(o?.b?.c);
console.log(nil?.a);
console.log(`${o?.a}`);
console.log([o?.a, o?.b?.c].join(","));

function f(x: any, y?: any): string {
  return `f(${x},${y})`;
}
console.log(f(o?.a));
console.log(f(o?.a, o?.b?.c));
console.log(f(nil?.a, "z"));
console.log(f?.(o?.a));

const t = { m: (x: any) => `m:${x}` };
console.log(t.m(o?.a));
console.log(t?.m(nil?.a ?? "d"));

const arr = [10, 20];
console.log(arr?.[0], arr?.length);

// 实参位与语句位混用，两处必须是同一个值
const v = o?.a;
console.log(v, o?.a, v === o?.a);
console.log(`interp ${o?.b?.c} ${nil?.a}`);
