// xl:title Object.keys / entries 对非对象与字符串
// xl:round 682
// xl:judge stdout
// xl:end
try { console.log("string", String(Object.keys('ab').join(','))); } catch (e) { console.log("string", "ERR", String(e && e.name)); }
try { console.log("entries-string", String(JSON.stringify(Object.entries('ab')))); } catch (e) { console.log("entries-string", "ERR", String(e && e.name)); }
try { console.log("array", String(Object.keys([7, 8]).join(','))); } catch (e) { console.log("array", "ERR", String(e && e.name)); }
try { console.log("proto-chain-ignored", String(Object.keys(Object.create({ hidden: 1 })).length)); } catch (e) { console.log("proto-chain-ignored", "ERR", String(e && e.name)); }
try { console.log("create-chain", String((() => { const proto: any = { a: 1 }; const o: any = Object.create(proto); o.b = 2; return Object.keys(o).join(',') + ':' + o.a; })())); } catch (e) { console.log("create-chain", "ERR", String(e && e.name)); }
