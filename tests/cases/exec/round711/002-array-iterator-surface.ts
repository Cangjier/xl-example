// xl:title 数组 / Map 的迭代器表面（Symbol.iterator、next 协议、取出 next 再调）
// xl:round 795
// xl:judge stdout
// xl:end
// **按判定点并组（第 795 轮）**：吸收 exec/round711 里逐条一问的 7 条探针
// （`p711c-c01` … `c05` · `c07` · `c08`）。`p711c-c06` 早在第 710 轮就并进了
// `exec/round710/001-arrayiterator-no-next`，所以不在这里。
// 正文逐句搬进 `probe(f)` 小壳（前置声明留在同一个箭头体内），打印口径与探针一字不差。
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f: any) => {
  try { console.log(show(f())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
};

probe(() => typeof ([] as any)[Symbol.iterator]);
probe(() => JSON.stringify(([1, 2] as any)[Symbol.iterator]().next()));
probe(() => { const it: any = ([1] as any)[Symbol.iterator](); it.next(); return JSON.stringify(it.next()); });
probe(() => [...([1, 2] as any)[Symbol.iterator]()].join(","));
probe(() => ([] as any)[Symbol.iterator] === ([] as any).values);
probe(() => typeof (new Map() as any)[Symbol.iterator]);
probe(() => { const it: any = ([5] as any)[Symbol.iterator](); const step: any = it.next; return step.call(it).value; });
