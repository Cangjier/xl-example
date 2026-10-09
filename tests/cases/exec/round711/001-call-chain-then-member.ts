// xl:title 调用链之后再取成员（下标 / 点号 / 运算符位与实参位）
// xl:round 795
// xl:judge stdout
// xl:end
// **按判定点并组（第 795 轮）**：吸收 exec/round711 里逐条一问的 18 条探针
// （`p711a-a01` … `a12` · `p711b-b01` … `b06`）。它们是同一条根——第 692 轮量到的
// 「`o["f"]().v` 整段丢」，这里只是把那条链放在不同位置（取值 / 运算符 / 实参）。
// 正文逐句搬进自己的箭头体（前置声明留在同一个箭头体内），打印口径与探针一字不差。
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f: any) => {
  try { console.log(show(f())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
};

probe(() => { const o: any = { f: () => ({ v: 1 }) }; const k = "f"; return typeof o[k]().v; });
probe(() => { const o: any = { f: () => ({ v: 1 }) }; const k = "f"; return typeof o["f"]().v; });
probe(() => { const o: any = { f: () => ({ v: 1 }) }; const k = "f"; return typeof o.f().v; });
probe(() => typeof ([{ v: 1 }] as any)[0]["v"]);
probe(() => { const o: any = { f: () => ({ v: 1 }) }; const k = "f"; return (typeof o[k]().v) === (typeof o[k]().v); });
probe(() => { const o: any = { f: () => ({ g: () => 7 }) }; const k = "f"; return o[k]().g(); });
probe(() => { const o: any = { f: () => ({ v: { w: 2 } }) }; const k = "f"; return typeof o[k]().v.w; });
probe(() => { const o: any = { f: () => ({ v: 1 }) }; const k = "f"; return void o[k]().v; });
probe(() => { const o: any = { f: () => ({ v: 1 }) }; const k = "f"; return !o[k]().v; });
probe(() => { const arr: any = [() => ({ v: 2 })]; const i = 0; return typeof arr[i]().v; });
probe(() => { const o: any = { f: () => ({ g: () => ({ v: 3 }) }) }; const k = "f"; return typeof o[k]().g().v; });
probe(() => { const o: any = { f: () => ({ v: 1 }) }; const k = "f"; return typeof o[k]().v.toString; });
probe(() => { const o: any = { f: () => ({ v: 1 }) }; const k = "f"; return o[k]().v + ""; });
probe(() => { const o: any = { f: () => ({ v: 1 }) }; const k = "f"; return 1 + o[k]().v; });
probe(() => { const o: any = { f: () => ({ v: 1 }) }; const k = "f"; return o[k]().v === 1; });
probe(() => { const o: any = { f: () => ({ v: 1 }) }; const k = "f"; return [o[k]().v].join(","); });
(() => { const o: any = { f: () => ({ v: 1 }) }; const k = "f"; console.log(typeof o[k]().v); })();
probe(() => { const o: any = { f: () => ({ v: 1 }) }; const k = "f"; return o.f().v + ""; });
