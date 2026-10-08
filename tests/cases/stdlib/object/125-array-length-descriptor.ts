// xl:title 数组的 length 描述符（削短与越界读）
// xl:round 683
// xl:judge stdout
// xl:end
try { console.log("define-length", String((() => { const a: any = [1, 2, 3]; Object.defineProperty(a, 'length', { value: 1 }); return a.length + ':' + String(a[2]); })())); } catch (e) { console.log("define-length", "ERR", String(e && e.name)); }
try { console.log("define-writable-false", String((() => { const a: any = [1, 2]; Object.defineProperty(a, 'length', { writable: false }); try { a.push(3); return 'pushed:' + a.length; } catch (e: any) { return 'ERR ' + String(e.name); } })())); } catch (e) { console.log("define-writable-false", "ERR", String(e && e.name)); }
