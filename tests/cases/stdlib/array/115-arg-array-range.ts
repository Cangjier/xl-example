// xl:title 参数位：fill / copyWithin / slice 的两个下标
// xl:round 681
// xl:judge stdout
// xl:end
const f: any = [1, 2, 3, 4].fill(0, 1, 3);
const cp: any = [1, 2, 3, 4, 5].copyWithin(0, 3);
const eq: any = [1, 2, 3, 4].fill(0, -2);
try { console.log("fill", String(f)); } catch (e) { console.log("fill", "ERR", String(e && e.name)); }
try { console.log("copyWithin", String(cp)); } catch (e) { console.log("copyWithin", "ERR", String(e && e.name)); }
try { console.log("fill-neg", String(eq)); } catch (e) { console.log("fill-neg", "ERR", String(e && e.name)); }
try { console.log("slice--2", String([1, 2, 3].slice(-2))); } catch (e) { console.log("slice--2", "ERR", String(e && e.name)); }
try { console.log("slice-1--1", String([1, 2, 3].slice(1, -1))); } catch (e) { console.log("slice-1--1", "ERR", String(e && e.name)); }
try { console.log("slice--9", String([1, 2, 3].slice(-9))); } catch (e) { console.log("slice--9", "ERR", String(e && e.name)); }
