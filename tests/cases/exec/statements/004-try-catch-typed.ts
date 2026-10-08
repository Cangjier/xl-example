// xl:title `catch (e: unknown)` 与 catch 不用变量
// xl:judge stdout
// xl:end

try { throw new Error("x"); } catch (e: unknown) { console.log("typed", (e as Error).message); }
try { throw 1; } catch { console.log("bare catch"); }
