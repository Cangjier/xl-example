// xl:title `encodeURIComponent` / `decodeURIComponent` 往返
// xl:round 305
// xl:judge stdout
// xl:end

const s = "a b&c=d";
const enc = encodeURIComponent(s);
console.log(enc, decodeURIComponent(enc) === s, encodeURI("http://x/y z"));
