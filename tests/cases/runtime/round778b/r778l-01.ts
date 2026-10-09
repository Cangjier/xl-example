// xl:title `switch` 的词法作用域：块级声明的初始化、重复 `let` 与函数声明
// xl:round 778
// xl:judge stdout
// xl:want blocked
// xl:why **量出来的形状**（第 778 轮第二普查当场红的那一行）：跨 `case` 引用的那个 `let`
// xl:why 在**降级期**就被判成「用在声明之前」——`switch (x) { case 1: return String(v);`
// xl:why `case 2: let v = "two"; }` 报 `name used before its declaration: v`（**整份文件进不来**），
// xl:why 而 Node 给的是运行时 `ReferenceError`、**脚本自己接得住**（第 5 行的判据就是它）。
// xl:why **这个扫描是保守的**：`ResolveAccess`（`lowering.xl.md`）那句
// xl:why 「名字在声明名单里 ⇒ 用在声明之前」是**函数体那一层的预扫**，
// xl:why 它只看「声明出现过没有」，不看「这一条路径先走了谁」——
// xl:why 同一个 `switch` 块里所有 `case` 共用一个作用域，于是**另一条 case 的声明**
// xl:why 把这一条 case 的读判成了过早。
// xl:why **分界由同一条用例的其余档钉着**：`case` 各自带块（04）、`var`（06）、
// xl:why `case` 里的函数声明（07）、以及 01 / 02 / 03 / 08…15 全对。
// xl:why **为什么它比「形状差一点」更值得登**：症状是**整份文件进不来**，
// xl:why 而按 `case` 写的 `switch` 遍地都是；收它要么让这一趟预扫认识 `switch` 的分支，
// xl:why 要么把 TDZ 挪到运行期（后者是这一层一直没做的那件事）。
// xl:end
// 第 778 轮第二普查面：`switch` 那一族的**语义**边角（形状那一半语料里很多）。
// 三个要点：**同一个 `switch` 块里所有 `case` 共用一个词法作用域**（跨 case 的 `let`
// 会撞名 ⇒ 重复声明是语法错误）；**`let` 的 TDZ 覆盖整个块**（在声明之前读会抛，
// 而 `var` 不会）；**case 里的函数声明**在块里提升、块外看不见。
const show = (v: any): string => (v === null ? "null" : typeof v === "string" ? JSON.stringify(v) : String(v));
const run = (f: () => any): string => { try { return show(f()); } catch (e: any) { return "throw:" + e.constructor.name; } };
console.log('01 空 switch 落到后面', run(() => {
  const f = (x: any): string => { switch (x) { } return "fell"; };
  return f(1);
}));
console.log('02 落空与 break', run(() => {
  const f = (x: number): string => { let s = ""; switch (x) { case 1: s += "a"; case 2: s += "b"; break; case 3: s += "c"; } return s + "|end"; };
  return [f(1), f(2), f(3), f(9)].join(",");
}));
console.log('03 default 在中间也照顺序落', run(() => {
  const f = (x: number): string => { let s = ""; switch (x) { case 1: s += "1"; break; default: s += "d"; case 2: s += "2"; } return s; };
  return [f(1), f(2), f(9)].join(",");
}));
console.log('04 case 里的块级声明不跨 case', run(() => {
  const f = (x: number): string => { switch (x) { case 1: { const v = "one"; return v; } case 2: { const v = "two"; return v; } } return "none"; };
  return [f(1), f(2), f(3)].join(",");
}));
console.log('05 跨 case 的 let 该在声明前抛 TDZ', run(() => {
  const f = (x: number): string => { switch (x) { case 1: return String(v); case 2: let v = "two"; return v; } return "none"; };
  return f(1);
}));
console.log('06 var 在 switch 块里不抛', run(() => {
  const f = (x: number): string => { switch (x) { case 1: return String(w); case 2: var w: any = "two"; } return "none"; };
  return f(1);
}));
console.log('07 case 里的函数声明', run(() => {
  const f = (x: number): string => { switch (x) { case 1: { function g(): string { return "g1"; } return g(); } default: return "d"; } };
  return [f(1), f(2)].join(",");
}));
console.log('08 case 后面跟块语句', run(() => {
  const f = (x: number): string => { let s = ""; switch (x) { case 1: { s += "a"; break; } case 2: s += "b"; } return s + "|"; };
  return [f(1), f(2), f(3)].join(",");
}));
console.log('09 switch 的表达式只求值一次', run(() => {
  let calls = 0;
  const f = (): string => { switch ((calls += 1, 2)) { case 1: return "one"; case 2: return "two"; } return "none"; };
  return [f(), calls].join("|");
}));
console.log('10 case 的表达式按顺序求值、命中即停', run(() => {
  const log: string[] = [];
  const f = (x: number): string => { const tag = (v: number): number => { log.push("c" + v); return v; }; switch (x) { case tag(1): return "one"; case tag(2): return "two"; case tag(3): return "three"; } return "none"; };
  const r = f(2);
  return [r, log.join(",")].join("|");
}));
console.log('11 switch 用严格相等', run(() => {
  const f = (x: any): string => { switch (x) { case "1": return "str"; case 1: return "num"; } return "none"; };
  return [f(1), f("1"), f(true)].join(",");
}));
console.log('12 NaN 走 default', run(() => {
  const f = (x: number): string => { switch (x) { case NaN: return "nan"; default: return "def"; } };
  return f(NaN);
}));
console.log('13 -0 与 0 同一格', run(() => {
  const f = (x: number): string => { switch (x) { case 0: return "zero"; } return "none"; };
  return f(-0);
}));
console.log('14 switch 里 return 与 finally', run(() => {
  const f = (x: number): string => { const log: string[] = []; try { switch (x) { case 1: return "r1"; default: return "rd"; } } finally { log.push("f"); } };
  return f(1) + "|" + f(9);
}));
console.log('15 switch 里 continue 到外层循环', run(() => {
  const out: string[] = [];
  for (let i = 0; i < 4; i++) { switch (i) { case 1: continue; default: out.push(String(i)); } }
  return out.join(",");
}));
