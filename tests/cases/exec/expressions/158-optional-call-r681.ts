// xl:title 可选调用：`o?.m?.()` 与缺成员
// xl:round 681
// xl:judge stdout
// xl:end
const o: any = { m() { return 1; } };
try { console.log("call", String(o?.m?.())); } catch (e) { console.log("call", "ERR", String(e && e.name)); }
try { console.log("missing", String(o?.nope?.())); } catch (e) { console.log("missing", "ERR", String(e && e.name)); }
try { console.log("index", String(typeof o?.m?.call)); } catch (e) { console.log("index", "ERR", String(e && e.name)); }
try { console.log("call-through", String(o?.m?.call(null))); } catch (e) { console.log("call-through", "ERR", String(e && e.name)); }
try { console.log("chain-after-null", String((() => { const n: any = null; return String(n?.a?.b); })())); } catch (e) { console.log("chain-after-null", "ERR", String(e && e.name)); }
