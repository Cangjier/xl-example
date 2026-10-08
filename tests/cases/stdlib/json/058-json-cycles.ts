// xl:title JSON 的环、toJSON 与空格
// xl:round 682
// xl:judge stdout
// xl:end
try { console.log("cycle", String((() => { const o: any = {}; o.self = o; try { return JSON.stringify(o); } catch (e: any) { return 'ERR ' + String(e.name); } })())); } catch (e) { console.log("cycle", "ERR", String(e && e.name)); }
try { console.log("tojson", String(JSON.stringify({ v: { toJSON() { return 'j'; } } }))); } catch (e) { console.log("tojson", "ERR", String(e && e.name)); }
try { console.log("undefined-drop", String(JSON.stringify({ a: undefined, b: 1 }))); } catch (e) { console.log("undefined-drop", "ERR", String(e && e.name)); }
try { console.log("array-null", String(JSON.stringify([undefined, () => 1]))); } catch (e) { console.log("array-null", "ERR", String(e && e.name)); }
try { console.log("space-string", String(JSON.stringify({ a: 1 }, null, '--'))); } catch (e) { console.log("space-string", "ERR", String(e && e.name)); }
