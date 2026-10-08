// xl:title 错误的文本形状
// xl:round 682
// xl:judge stdout
// xl:end
const named: any = new Error('boom'); named.name = 'Custom';
try { console.log("plain", String(String(new Error('boom')))); } catch (e) { console.log("plain", "ERR", String(e && e.name)); }
try { console.log("type", String(String(new TypeError('bad')))); } catch (e) { console.log("type", "ERR", String(e && e.name)); }
try { console.log("custom", String(String(named))); } catch (e) { console.log("custom", "ERR", String(e && e.name)); }
try { console.log("empty-message", String(String(new Error()))); } catch (e) { console.log("empty-message", "ERR", String(e && e.name)); }
try { console.log("instanceof", String([new TypeError('x') instanceof TypeError, new TypeError('x') instanceof Error].join(','))); } catch (e) { console.log("instanceof", "ERR", String(e && e.name)); }
