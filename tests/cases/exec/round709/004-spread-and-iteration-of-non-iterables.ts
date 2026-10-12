// xl:title 展开 / for..of / 解构一个不可迭代物（字符串与真数组是正例）
// xl:round 795
// xl:judge stdout
// xl:end
// **按判定点并组（第 795 轮）**：吸收 exec/round709 里逐条一问的 10 条探针
// （`p709c-c01` … `c08` · `c10` · `c11` · `c12`）。正文逐句搬，打印口径与探针一字不差。
// 头一句「展开一个字符串」原先还吸收过 `p709c-c09` 与 `exec/round710/p710c-c11`
// （那两条与本句逐字节相同，第 710 轮并进来的）。
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f: any) => {
  try { console.log(show(f())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
};

probe(() => [...("ab" as any)].join(","));
probe(() => [...(42 as any)].length);
try { for (const x of (42 as any)) { console.log(x); } } catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
probe(() => [...(null as any)].length);
probe(() => [...({} as any)].length);
probe(() => (function () { const [a] = (42 as any); return a; })());
probe(() => [...[1, 2]].join(","));
try { for (const x of ({} as any)) { console.log(x); } } catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
try { [...({ length: 1 } as any)]; console.log("no"); } catch (e: any) { console.log("isTypeError:" + (e instanceof TypeError)); }
try { for (const x of ({ length: 1 } as any)) { console.log(x); } console.log("no"); } catch (e: any) { console.log("isTypeError:" + (e instanceof TypeError)); }
