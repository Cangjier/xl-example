// xl:title encodeURI / encodeURIComponent / decode 家族与 URIError
// xl:judge stdout
// xl:end

console.log(encodeURIComponent("a b&c=d"), encodeURI("http://x/a b?q=1&r=2"));
console.log(decodeURIComponent("%E4%B8%AD"), encodeURIComponent("中").length);
try { decodeURIComponent("%"); } catch (e) { console.log("uri:" + (e as Error).name); }
try { decodeURI("%E4%B8"); } catch (e) { console.log("uri2:" + (e as Error).name); }
