// xl:title 边界：Object.entries / fromEntries / assign / create(null)
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("entries-string", String(JSON.stringify(Object.entries('ab')))); } catch (e) { console.log("entries-string", "ERR", String(e && e.name)); }
try { console.log("fromEntries", String(JSON.stringify(Object.fromEntries([['a', 1], ['b', 2]])))); } catch (e) { console.log("fromEntries", "ERR", String(e && e.name)); }
try { console.log("assign-null", String(JSON.stringify(Object.assign({ a: 1 }, null, undefined, { b: 2 })))); } catch (e) { console.log("assign-null", "ERR", String(e && e.name)); }
try { console.log("create-null", String(String(Object.keys(Object.assign(Object.create(null), { a: 1 }))))); } catch (e) { console.log("create-null", "ERR", String(e && e.name)); }
try { console.log("ownNames-array", String(JSON.stringify(Object.getOwnPropertyNames([1, 2])))); } catch (e) { console.log("ownNames-array", "ERR", String(e && e.name)); }
try { console.log("is-pair", String([Object.is(NaN, NaN), Object.is(0, -0), Object.is('1', 1)].join(','))); } catch (e) { console.log("is-pair", "ERR", String(e && e.name)); }
