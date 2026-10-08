// xl:title sort 的比较器返回 0 / NaN 与稳定性
// xl:round 682
// xl:judge stdout
// xl:end
const rows: any = [{ k: 2, id: 'a' }, { k: 1, id: 'b' }, { k: 2, id: 'c' }, { k: 1, id: 'd' }];
const stable = rows.slice().sort((x: any, y: any) => x.k - y.k);
try { console.log("stable", String(stable.map((r: any) => r.id).join(''))); } catch (e) { console.log("stable", "ERR", String(e && e.name)); }
try { console.log("zero", String([3, 1, 2].sort(() => 0).join(','))); } catch (e) { console.log("zero", "ERR", String(e && e.name)); }
try { console.log("strings", String(['10', '9', '1'].sort().join(','))); } catch (e) { console.log("strings", "ERR", String(e && e.name)); }
try { console.log("numbers", String([10, 9, 1].sort((a, b) => a - b).join(','))); } catch (e) { console.log("numbers", "ERR", String(e && e.name)); }
