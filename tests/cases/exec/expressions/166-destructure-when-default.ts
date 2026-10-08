// xl:title 解构默认值只在 undefined 时生效
// xl:round 682
// xl:judge stdout
// xl:end
const [x1 = 1, x2 = 2] = [undefined, null] as any;
const { a: a1 = 1, b: b1 = 2 } = { b: null } as any;
const key = 'k';
const { [key]: computed = 5 } = {} as any;
try { console.log("array", String([x1, x2].join(','))); } catch (e) { console.log("array", "ERR", String(e && e.name)); }
try { console.log("object", String([a1, b1].join(','))); } catch (e) { console.log("object", "ERR", String(e && e.name)); }
try { console.log("computed", String(computed)); } catch (e) { console.log("computed", "ERR", String(e && e.name)); }
