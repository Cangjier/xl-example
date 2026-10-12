// xl:title `toFixed` → `Number` 往返，以及 `parseFloat` / `parseInt` 的边角
// xl:judge stdout
// xl:end

const x = 1 / 3;
console.log(x.toFixed(4), Number(x.toFixed(4)) === 0.3333);
console.log(parseFloat("1.5e2"), parseInt("0x1f"), Number("  7  "));
