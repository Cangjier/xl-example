// xl:title 标签语句与跳转：带标签的 break / continue 落在哪一层
// xl:round 778
// xl:judge stdout
// xl:end
// 第 778 轮普查面：标签（`Label`）与跳转。这一族此前只在「箭头体里的标签块」那一轮
// 被顺带碰过，跳出**外层**循环、`continue` 到外层、标签套在块上这几档都没进过语料。
// 判据是每一档的最终序列；第 05 行钉的是「同名标签不许嵌套」这条语法边界
// （Node 在**解析期**就报 `Label l is already declared`，所以这一行写成 try 里也接不住）。
const show = (v: any): string => (typeof v === "string" ? JSON.stringify(v) : String(v));
console.log('01 单层带标签 break', show((() => { let s = ""; outer: for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) { if (i === 1 && j === 1) break outer; s += `${i}${j};`; } } return s; })()));
console.log('02 单层带标签 continue', show((() => { let s = ""; outer: for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) { if (j === 1) continue outer; s += `${i}${j};`; } } return s; })()));
console.log('03 标签套在块上', show((() => { let s = ""; blk: { s += "a"; if (s.length === 1) break blk; s += "b"; } return s + "z"; })()));
console.log('04 标签套在 if 上', show((() => { let s = ""; lab: if (true) { s += "x"; break lab; } return s + "y"; })()));
console.log('05 不同名的嵌套标签', show((() => { let s = ""; a: for (let i = 0; i < 2; i++) { b: for (let j = 0; j < 2; j++) { if (j === 1) break a; s += `${i}${j};`; } } return s; })()));
console.log('06 while 上的标签', show((() => { let s = ""; let i = 0; lab: while (i < 3) { i++; if (i === 2) continue lab; s += i; } return s; })()));
console.log('07 do-while 上的标签', show((() => { let s = ""; let i = 0; lab: do { i++; if (i === 2) continue lab; s += i; } while (i < 3); return s; })()));
console.log('08 for-of 上的标签', show((() => { let s = ""; lab: for (const x of [1, 2, 3]) { if (x === 2) continue lab; s += x; } return s; })()));
console.log('09 switch 里的带标签 break', show((() => { let s = ""; lab: for (let i = 0; i < 3; i++) { switch (i) { case 1: break lab; default: s += i; } } return s; })()));
console.log('10 try/finally 里的标签 break', show((() => { const s: string[] = []; lab: for (let i = 0; i < 3; i++) { try { if (i === 1) break lab; s.push("t" + i); } finally { s.push("f" + i); } } return s.join(","); })()));
console.log('11 标签后面跟着的语句照跑', show((() => { let s = ""; lab: s += "1"; s += "2"; return s; })()));
console.log('12 循环体里的裸块', show((() => { let s = ""; for (let i = 0; i < 3; i++) { { s += i; } } return s; })()));
console.log('13 嵌套标签同一次跳两层', show((() => { let s = ""; a: for (let i = 0; i < 2; i++) { b: for (let j = 0; j < 2; j++) { for (let k = 0; k < 2; k++) { if (k === 1) continue b; if (j === 1) continue a; s += `${i}${j}${k};`; } } } return s; })()));
console.log('14 标签与闭包', show((() => { let s = ""; lab: for (let i = 0; i < 2; i++) { const f = (): string => { return "c" + i; }; s += f(); if (i === 0) continue lab; } return s; })()));
console.log('15 catch 里的带标签 break', show((() => { let s = ""; lab: for (let i = 0; i < 3; i++) { try { if (i === 1) throw new Error("e"); s += i; } catch { continue lab; } } return s; })()));
