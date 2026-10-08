// xl:title try / finally 的返回值与 finally 里的 return
// xl:round 681
// xl:judge stdout
// xl:end
function a(): string { try { return 'try'; } finally { } }
function b(): string { try { return 'try'; } finally { return 'fin'; } }
function d(): string { let s = ''; try { s += 't'; throw new Error('x'); } catch { s += 'c'; } finally { s += 'f'; } return s; }
try { console.log("plain", String(a())); } catch (e) { console.log("plain", "ERR", String(e && e.name)); }
try { console.log("override", String(b())); } catch (e) { console.log("override", "ERR", String(e && e.name)); }
try { console.log("order", String(d())); } catch (e) { console.log("order", "ERR", String(e && e.name)); }
try { console.log("opt-catch", String((() => { try { throw 1; } catch { return 'caught'; } })())); } catch (e) { console.log("opt-catch", "ERR", String(e && e.name)); }
