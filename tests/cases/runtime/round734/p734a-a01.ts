// xl:title 原型方法那一族的 `name` / `length`：`Array` / `String` / `Number` / `Object` 四家
// xl:round 734
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f: any) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (Array.prototype.push as any).name) + " " + t(() => (Array.prototype.push as any).length));
console.log(t(() => (Array.prototype.slice as any).name) + " " + t(() => (Array.prototype.slice as any).length));
console.log(t(() => (Array.prototype.pop as any).name) + " " + t(() => (Array.prototype.pop as any).length));
console.log(t(() => (Array.prototype.toString as any).name) + " " + t(() => (Array.prototype.toString as any).length));
console.log(t(() => (String.prototype.toUpperCase as any).name) + " " + t(() => (String.prototype.toUpperCase as any).length));
console.log(t(() => (String.prototype.toLowerCase as any).name) + " " + t(() => (String.prototype.toLowerCase as any).length));
console.log(t(() => (String.prototype.slice as any).name) + " " + t(() => (String.prototype.slice as any).length));
console.log(t(() => (String.prototype.big as any).name) + " " + t(() => (String.prototype.big as any).length));
console.log(t(() => (String.prototype.anchor as any).name) + " " + t(() => (String.prototype.anchor as any).length));
console.log(t(() => (String.prototype.trimLeft as any).name));
console.log(t(() => (Number.prototype.toFixed as any).name) + " " + t(() => (Number.prototype.toFixed as any).length));
console.log(t(() => (Object.prototype.hasOwnProperty as any).name) + " " + t(() => (Object.prototype.hasOwnProperty as any).length));
console.log(t(() => (Error.prototype.toString as any).name) + " " + t(() => (Error.prototype.toString as any).length));
console.log(t(() => (Promise.prototype.then as any).name) + " " + t(() => (Promise.prototype.then as any).length));
