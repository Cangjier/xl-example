# namespace cangjie

# class MethodNameTemplate

## field BanedNames:Array<string> = ["if", "for", "foreach", "while", "catch", "async", "return", "as", "await"]

## field AllowedNames:Array<string> = []

## method Ban:(items:Array<string>)=>MethodNameTemplate

```ts
this.BanedNames.push(...items);
return this;
```

## method Allow:(items:Array<string>)=>MethodNameTemplate

```ts
this.AllowedNames.push(...items);
return this;
```

## method IsMethodName:(name:string)=>bool

```ts
if (this.AllowedNames.includes(name)) {
  return true;
}
if (this.BanedNames.includes(name)) {
  return false;
}
return true;
```
