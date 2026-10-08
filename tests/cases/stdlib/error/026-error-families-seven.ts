// xl:title 七个错误族 + `decodeURIComponent` 抛出来的名字
// xl:round 376
// xl:judge stdout
// xl:end
const errs = [new Error("e"), new TypeError("t"), new RangeError("r"), new SyntaxError("s"),
  new ReferenceError("ref"), new EvalError("ev"), new URIError("u")];
console.log("A", errs.map((e) => e.name).join(","));
console.log("B", errs.map((e) => e instanceof Error).join(","));
console.log("C", new TypeError("t") instanceof TypeError, new TypeError("t") instanceof RangeError);
console.log("D", new URIError("u") instanceof URIError, new EvalError("e") instanceof EvalError);
console.log("E", new URIError("x").message, String(new EvalError("boom")), new URIError("u").constructor === URIError);
try { decodeURIComponent("%"); } catch (e) { console.log("F", (e as Error).name, (e as Error).message); }
try { decodeURIComponent("%zz"); } catch (e) { console.log("G", (e as Error).name); }
try { decodeURI("%"); } catch (e) { console.log("H", (e as Error).name); }
try { decodeURI("%E4%B8"); } catch (e) { console.log("I", (e as Error).name); }
console.log("J", decodeURIComponent("%E4%B8%AD"), decodeURIComponent("a%20b"), encodeURIComponent("\u00e9\u4e2d"));
