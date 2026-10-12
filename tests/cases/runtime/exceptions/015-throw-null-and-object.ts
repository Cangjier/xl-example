// xl:title 抛非 Error 的值：字符串 / 数字 / 对象 / null，catch 拿到的是原样那个值
// xl:judge stdout
// xl:end
// **第 794 轮把 012 与同一个判定点的 11 条探针并了进来**（探针正文一字未改，
// 只裹进各自的 `show` 小壳里；下面的表达式与探针的 `xl:title` 逐字相同）：
//   · 012（throw 字符串 / 42 / 对象 / null 各一行）
//   · probe694-x02（`try { throw "s" } catch (e) { return typeof e }`）
//   · probe694-x01（`try { throw 1 } catch (e) { return e }`）
//   · probe694-x03（`try { throw null } catch (e) { return String(e) }`）
//   · probe694-x04（`try { throw undefined } catch (e) { return typeof e }`）
//   · probe695-x07（箭头函数里 `throw 1`，catch 拿到的就是 1）
//   · probe3-x11（`[].reduce((a, b) => a)` 抛 `TypeError`）
//   · probe3-x13（`"a".repeat(-1)` 抛 `RangeError`）
//   · probe694-x25（`typeof notDefined123` 不抛——未声明的名字在 `typeof` 里是安全读）
//   · 036 / probe695-x01（`null.x` 抛的确实是 `TypeError`）
//   · 037（`(1).toFixed(200)` 抛 `RangeError`）
//   · 038（`JSON.parse("{")` 抛 `SyntaxError`）
//   · 039（`decodeURIComponent("%")` 抛 `URIError`）
//   · 040（`new Array(-1)` 抛 `RangeError`）
//   · 015（抛的是**原样那个值**：null / undefined / 0 / "" / false / 对象同一性）
// 判定点只有一个：**抛出去的那个值原样到达 catch，以及内置操作各自抛哪一族**。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
try { throw "s"; } catch (e) { console.log("str", e, typeof e); }
try { throw 42; } catch (e) { console.log("num", (e as number) + 1); }
try { throw { code: 7 }; } catch (e) { console.log("obj", (e as any).code); }
try { throw null; } catch (e) { console.log("null", e); }
function probe(v: any) { try { throw v; } catch (e: any) { return e === v ? "same" : "other"; } }
console.log(probe(null), probe(undefined), probe(0), probe(""), probe(false));
const obj = { tag: 1 };
try { throw obj; } catch (e: any) { console.log(e === obj, e.tag); }
try { console.log("typeof-throw:", show((function () { try { throw "s"; } catch (e) { return typeof e; } })())); }
catch (e: any) { console.log("typeof-throw:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("rethrow-value:", show((function () { try { throw 1; } catch (e) { return e; } })())); }
catch (e: any) { console.log("rethrow-value:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("throw-null:", show((function () { try { throw null; } catch (e) { return String(e); } })())); }
catch (e: any) { console.log("throw-null:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("typeof-throw-undefined:", show((function () { try { throw undefined; } catch (e) { return typeof e; } })())); }
catch (e: any) { console.log("typeof-throw-undefined:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("arrow-throw:", show((function () { const f = () => { throw 1; }; try { f(); } catch (e) { return e; } })())); }
catch (e: any) { console.log("arrow-throw:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("empty-reduce:", show((function () { try { [].reduce((a, b) => a); } catch (e) { return e.constructor.name; } })())); }
catch (e: any) { console.log("empty-reduce:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("repeat-negative:", show((function () { try { "a".repeat(-1); } catch (e) { return e.constructor.name; } })())); }
catch (e: any) { console.log("repeat-negative:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("typeof-undeclared:", show((function () { try { return typeof notDefined123; } catch (e) { return e.constructor.name; } })())); }
catch (e: any) { console.log("typeof-undeclared:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("null-get:", show((function () { try { null.x; } catch (e) { return e instanceof TypeError; } })())); }
catch (e: any) { console.log("null-get:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("tofixed:", show((function () { try { (1).toFixed(200); } catch (e) { return e.constructor.name; } })())); }
catch (e: any) { console.log("tofixed:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("json-parse:", show((function () { try { JSON.parse("{"); } catch (e) { return e.constructor.name; } })())); }
catch (e: any) { console.log("json-parse:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("decode-uri:", show((function () { try { decodeURIComponent("%"); } catch (e) { return e.constructor.name; } })())); }
catch (e: any) { console.log("decode-uri:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("new-array:", show((function () { try { new Array(-1); } catch (e) { return e.constructor.name; } })())); }
catch (e: any) { console.log("new-array:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
