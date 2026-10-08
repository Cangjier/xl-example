// xl:title 可选链的几种收尾
// xl:round 683
// xl:judge stdout
// xl:end
const o: any = { a: { b: () => 'ab' }, arr: [1, 2], nil: null };
try { console.log("call-chain", String(o.a?.b?.())); } catch (e) { console.log("call-chain", "ERR", String(e && e.name)); }
try { console.log("index-chain", String(o.arr?.[1])); } catch (e) { console.log("index-chain", "ERR", String(e && e.name)); }
try { console.log("index-missing", String(String(o.missing?.[0]))); } catch (e) { console.log("index-missing", "ERR", String(e && e.name)); }
try { console.log("nullish-call", String(String(o.nil?.()))); } catch (e) { console.log("nullish-call", "ERR", String(e && e.name)); }
try { console.log("mixed", String(o?.a?.b?.call(null))); } catch (e) { console.log("mixed", "ERR", String(e && e.name)); }
try { console.log("chain-then-binary", String((o.arr?.[0] ?? 0) + 1)); } catch (e) { console.log("chain-then-binary", "ERR", String(e && e.name)); }
