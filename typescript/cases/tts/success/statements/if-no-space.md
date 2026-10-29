# 预期 token 树（逐字）：`if(a)b;`

```text
0 1 2 3 4 5 6 7
i f ( a ) b ; ⏎
```

## [char 0] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="i"
```

## [char 1] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,2)  text="if"
```

## [char 2] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   └─ ConditionShape  pos=2  src=[2,3)
```

## [char 3] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   └─ ConditionShape  pos=2  src=[2,3)
      └─ Common  src=[3,4)  text="a"
```

## [char 4] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   └─ IdentifierShape  pos=3  src=[3,4)  text="a"
```

## [char 5] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=3  src=[3,4)  text="a"
   └─ Common  src=[5,6)  text="b"
```

## [char 6] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ IfStatementShape  pos=0  src=[0,7)
   ├─ IdentifierShape  pos=3  src=[3,4)  text="a"
   └─ ExpressionStatementShape  pos=5  src=[5,7)
      └─ IdentifierShape  pos=5  src=[5,6)  text="b"
```

## [char 7] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ IfStatementShape  pos=0  src=[0,7)
│  ├─ IdentifierShape  pos=3  src=[3,4)  text="a"
│  └─ ExpressionStatementShape  pos=5  src=[5,7)
│     └─ IdentifierShape  pos=5  src=[5,6)  text="b"
└─ WrapSymbol  src=[7,8)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,8)
└─ IfStatementShape  pos=0  src=[0,7)
   ├─ IdentifierShape  pos=3  src=[3,4)  text="a"
   └─ ExpressionStatementShape  pos=5  src=[5,7)
      └─ IdentifierShape  pos=5  src=[5,6)  text="b"
```
