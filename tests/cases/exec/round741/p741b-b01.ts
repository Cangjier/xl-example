// xl:title 降级层：`o?.m()` 与 `o?.m?.()`
// xl:round 741
// xl:judge stdout
// xl:end
const o: any = { m() { return 1; } };
const n: any = null;
console.log(o?.m(), n?.m?.());
