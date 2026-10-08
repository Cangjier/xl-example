// xl:title try / catch / finally 的几种嵌套与重抛
// xl:round 683
// xl:judge stdout
// xl:end
try { console.log("catch-throws", String((() => { const log: string[] = []; try { try { throw new Error('a'); } catch (e: any) { log.push('c1'); throw new Error('b'); } finally { log.push('f1'); } } catch (e: any) { log.push('c2:' + e.message); } return log.join(','); })())); } catch (e) { console.log("catch-throws", "ERR", String(e && e.name)); }
try { console.log("nested-return", String((() => { function f(): string { try { try { return 'inner'; } finally { return 'finally-inner'; } } finally { } } return f(); })())); } catch (e) { console.log("nested-return", "ERR", String(e && e.name)); }
try { console.log("throw-in-finally", String((() => { try { try { throw new Error('a'); } finally { throw new Error('f'); } } catch (e: any) { return e.message; } })())); } catch (e) { console.log("throw-in-finally", "ERR", String(e && e.name)); }
try { console.log("loop-finally", String((() => { const log: string[] = []; for (let i = 0; i < 3; i++) { try { if (i === 1) continue; log.push('t' + i); } finally { log.push('f' + i); } } return log.join(','); })())); } catch (e) { console.log("loop-finally", "ERR", String(e && e.name)); }
try { console.log("optional-catch-rethrow", String((() => { try { try { throw 'x'; } catch { throw 'y'; } } catch (e) { return String(e); } })())); } catch (e) { console.log("optional-catch-rethrow", "ERR", String(e && e.name)); }
