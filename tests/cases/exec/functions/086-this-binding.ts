// xl:title 方法摘出来之后的 this / call / apply / bind
// xl:round 682
// xl:judge stdout
// xl:end
const obj: any = { n: 7, m() { return this === undefined || this === null ? 'no-this' : String(this.n); } };
const loose: any = obj.m;
try { console.log("method", String(obj.m())); } catch (e) { console.log("method", "ERR", String(e && e.name)); }
try { console.log("extracted", String(loose())); } catch (e) { console.log("extracted", "ERR", String(e && e.name)); }
try { console.log("call", String(obj.m.call({ n: 9 }))); } catch (e) { console.log("call", "ERR", String(e && e.name)); }
try { console.log("apply", String(obj.m.apply({ n: 8 }, []))); } catch (e) { console.log("apply", "ERR", String(e && e.name)); }
try { console.log("bind", String(obj.m.bind({ n: 5 })())); } catch (e) { console.log("bind", "ERR", String(e && e.name)); }
