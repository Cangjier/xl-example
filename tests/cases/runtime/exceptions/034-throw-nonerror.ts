// xl:title 抛非 Error 值穿过帧与 catch 绑定
// xl:round 681
// xl:judge stdout
// xl:end
function t() { throw { code: 42 }; }
try { (t as any)(); } catch (e: any) { console.log('caught', e.code); }
try { console.log("rethrow", String((() => { try { try { throw 's'; } catch (e) { throw e + '!'; } } catch (e) { return String(e); } })())); } catch (e) { console.log("rethrow", "ERR", String(e && e.name)); }
