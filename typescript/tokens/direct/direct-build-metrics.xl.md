# dependencies
```xl
```

# namespace cangjie

直建的唯一计数 / strict / trace 出口：验收看这里的计数器，不看「有没有抛异常」。

# class DirectBuildMetrics

## static field Sessions:int = 0

## static field StatementsBuilt:int = 0

## static field Declined:int = 0

## static field IncompleteFallback:int = 0

## static field Errors:int = 0

## static field StrictViolations:int = 0

## static field LastDeclineReason:string = ""

## static field LastError:string = ""

## static field Strict:bool = false

## static field TraceEnabled:bool = false

## static field Traces:Array<string> = []

## static method Reset:()=>void

```ts
DirectBuildMetrics.Sessions = 0;
DirectBuildMetrics.StatementsBuilt = 0;
DirectBuildMetrics.Declined = 0;
DirectBuildMetrics.IncompleteFallback = 0;
DirectBuildMetrics.Errors = 0;
DirectBuildMetrics.StrictViolations = 0;
DirectBuildMetrics.LastDeclineReason = "";
DirectBuildMetrics.LastError = "";
DirectBuildMetrics.Traces.length = 0;
```

## static method Trace:(line:string)=>void

```ts
if (!DirectBuildMetrics.TraceEnabled) {
  return;
}
DirectBuildMetrics.Traces.push(line);
if (DirectBuildMetrics.Traces.length > 256) {
  DirectBuildMetrics.Traces.splice(0, DirectBuildMetrics.Traces.length - 256);
}
```
