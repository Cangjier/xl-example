// xl:title 集合族的 prototype / constructor / instanceof
// xl:judge stdout
// xl:end

console.log(new Map() instanceof Map, new Set() instanceof Set, [] instanceof Array);
console.log(Object.getPrototypeOf(new Map()) === Map.prototype, Map.prototype.constructor === Map);
console.log(new Map() instanceof Set, new Set() instanceof Map);
