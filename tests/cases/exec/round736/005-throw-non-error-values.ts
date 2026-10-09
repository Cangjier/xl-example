// xl:title `throw` 一个非 `Error` 值的形状
// xl:round 736
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `p736c-c13`；正文一字未动）。
// 判定点只有一个：**抛出去的不是 `Error` 时原样交回**——
// 字符串 / 数字 / `null` / 对象都不被包装，`catch` 拿到的是同一个值。
try { throw "plain"; } catch (e: any) { console.log(typeof e, e, e instanceof Error); }
try { throw 42; } catch (e: any) { console.log(typeof e, e + 1); }
try { throw null; } catch (e: any) { console.log(e === null, typeof e); }
try { throw { a: 1 }; } catch (e: any) { console.log(e.a, Object.prototype.toString.call(e)); }
