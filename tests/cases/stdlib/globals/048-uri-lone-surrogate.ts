// xl:title encodeURI / encodeURIComponent 遇到孤立代理项抛 URIError
// xl:round 647
// xl:judge stdout
// xl:end

console.log(encodeURIComponent("a b&c=d"));
try { encodeURIComponent("\uD800"); } catch (e) { console.log(e instanceof URIError, e.name); }
try { encodeURI("\uDC00"); } catch (e) { console.log(e instanceof URIError, e.name); }
console.log(encodeURIComponent("\uD83D\uDE00"));
try { decodeURIComponent("%E0%A4%A"); } catch (e) { console.log(e instanceof URIError, e.name); }
console.log(decodeURIComponent("%41%42"));
