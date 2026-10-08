// xl:title for-of 的解构与剩余
// xl:round 681
// xl:judge stdout
// xl:end
const rows: any = [{ k: 1, v: 'a' }, { k: 2, v: 'b' }];
let out = '';
for (const { k, v } of rows) out += k + v;
try { console.log("forof", String(out)); } catch (e) { console.log("forof", "ERR", String(e && e.name)); }
try { console.log("spread-new", String(String([...new Set([1, 2, 2, 3])]))); } catch (e) { console.log("spread-new", "ERR", String(e && e.name)); }
try { console.log("spread-max", String(Math.max(...[1, 5, 3]))); } catch (e) { console.log("spread-max", "ERR", String(e && e.name)); }
try { console.log("assign-pattern", String((() => { const [x, ...rest]: any = [1, 2, 3]; const { a, ...others }: any = { a: 1, b: 2 }; return x + '|' + String(rest) + '|' + a + '|' + String(Object.keys(others)); })())); } catch (e) { console.log("assign-pattern", "ERR", String(e && e.name)); }
