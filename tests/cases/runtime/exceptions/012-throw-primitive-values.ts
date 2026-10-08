// xl:title 抛非 Error 的值：字符串 / 数字 / 对象 / null
// xl:judge stdout
// xl:end

try { throw "s"; } catch (e) { console.log("str", e, typeof e); }
try { throw 42; } catch (e) { console.log("num", (e as number) + 1); }
try { throw { code: 7 }; } catch (e) { console.log("obj", (e as any).code); }
try { throw null; } catch (e) { console.log("null", e); }
