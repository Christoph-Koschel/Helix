import {
    BinaryExpression,
    Expression, LiteralExpression,
    Parser,
    Statement,
    SyntaxType,
    UnaryExpression,
    VariableDeclarationStatement
} from "./parser";
import {Diagnostic, Token, TokenType} from "./lexer";

export enum BoundType {
    VARIABLE_DECLARATION_STATEMENT,

    BINARY_EXPRESSION,
    UNARY_EXPRESSION,
    LITERAL_EXPRESSION
}

export enum Operation {
    ADDITION,
    SUBTRACTION,
    MULTIPLICATION,
    DIVISION,
    MODULE,
    AND,
    OR,
    BIT_AND,
    BIT_OR,
    BIT_NOT,
    SHIFT_RIGHT,
    SHIFT_LEFT,
    XOR,
    GRATER,
    GREATER_EQUALS,
    LESS,
    LESS_EQUALS,
    COMPARISON,
    NOT_COMPARISON,
    NOT
}

export type Type = "int" | "float" | "string" | "bool" | "any";

export abstract class BoundStatement {
    public type: BoundType;

    protected constructor(type: BoundType) {
        this.type = type;
    }

}

export class BoundVariableDeclarationStatement extends BoundStatement {
    private variable: Symbol;
    private value: BoundExpression;

    public constructor(variable: Symbol, value: BoundExpression) {
        super(BoundType.VARIABLE_DECLARATION_STATEMENT);
        this.variable = variable;
        this.value = value;
    }
}

export abstract class BoundExpression {
    public type: BoundType;

    protected constructor(type: BoundType) {
        this.type = type;
    }

    public abstract get kind(): Type
}

export class BoundBinaryExpression extends BoundExpression {
    public left: BoundExpression;
    public operator: Operation;
    public right: BoundExpression;
    private readonly returnType: Type;

    public constructor(left: BoundExpression, operator: Operation, right: BoundExpression, returnType: Type) {
        super(BoundType.BINARY_EXPRESSION);
        this.left = left;
        this.operator = operator;
        this.right = right;
        this.returnType = returnType;
    }

    get kind(): Type {
        return this.returnType;
    }
}

export class BoundUnaryExpression extends BoundExpression {
    public operator: Operation;
    public right: BoundExpression;
    private readonly returnType: Type;

    public constructor(operator: Operation, right: BoundExpression, returnType: Type) {
        super(BoundType.UNARY_EXPRESSION);
        this.operator = operator;
        this.right = right;
        this.returnType = returnType;
    }

    get kind(): Type {
        return this.returnType;
    }
}

export class BoundLiteralExpression extends BoundExpression {
    private returnType: Type;
    public value: any;

    public constructor(value: any) {
        super(BoundType.LITERAL_EXPRESSION);
        this.value = value;
        this.returnType = typeof value == "boolean" ?
            "bool" :
            typeof value == "string" ?
                "string" :
                typeof value == "number" ?
                    value % 1 == 0 ?
                        "int" :
                        "float" :
                    "any";
    }

    get kind(): Type {
        return this.returnType;
    }
}


export class BoundProgram {
    public statements: BoundStatement[];

    public constructor(statements: BoundStatement[]) {
        this.statements = statements;
    }
}

export enum SymbolType {
    VARIABLE
}

export type Symbol = {
    type: SymbolType,
    kind: Type,
    name: string
}

export class Scope {
    private readonly parent: Scope | null;
    private readonly symbols: Set<Symbol>;

    public constructor(parent: Scope | null) {
        this.parent = parent;
        this.symbols = new Set<Symbol>();
    }

    public declareSymbol(symbol: Symbol): void {
        this.symbols.add(symbol);
    }

    public lookupSymbol(name: string, ...types: SymbolType[]): Symbol | null {
        for (let symbol of this.symbols) {
            if (symbol.name == name && types.includes(symbol.type)) {
                return symbol;

            }
        }

        if (this.parent != null) {
            return this.parent.lookupSymbol(name, ...types);
        }

        return null;
    }
}

const BINARY_CASES: [Type, Operation, Type, Type][] = [
    ["int", Operation.ADDITION, "int", "int"],
    ["float", Operation.ADDITION, "int", "float"],
    ["int", Operation.ADDITION, "float", "float"],

    ["int", Operation.SUBTRACTION, "int", "int"],
    ["float", Operation.SUBTRACTION, "int", "float"],
    ["int", Operation.SUBTRACTION, "float", "float"],

    ["int", Operation.MULTIPLICATION, "int", "int"],
    ["float", Operation.MULTIPLICATION, "int", "float"],
    ["int", Operation.MULTIPLICATION, "float", "float"],

    ["int", Operation.DIVISION, "int", "int"],
    ["float", Operation.DIVISION, "int", "float"],
    ["int", Operation.DIVISION, "float", "float"],

    ["int", Operation.MODULE, "int", "int"],
    ["float", Operation.MODULE, "int", "float"],
    ["int", Operation.MODULE, "float", "float"],

    ["int", Operation.COMPARISON, "int", "bool"],
    ["int", Operation.NOT_COMPARISON, "int", "bool"],
    ["int", Operation.LESS, "int", "bool"],
    ["int", Operation.LESS_EQUALS, "int", "bool"],
    ["int", Operation.GRATER, "int", "bool"],
    ["int", Operation.GREATER_EQUALS, "int", "bool"],

    ["float", Operation.COMPARISON, "float", "bool"],
    ["float", Operation.NOT_COMPARISON, "float", "bool"],
    ["float", Operation.LESS, "float", "bool"],
    ["float", Operation.LESS_EQUALS, "float", "bool"],
    ["float", Operation.GRATER, "float", "bool"],
    ["float", Operation.GREATER_EQUALS, "float", "bool"],

    ["int", Operation.COMPARISON, "float", "bool"],
    ["int", Operation.NOT_COMPARISON, "float", "bool"],
    ["int", Operation.LESS, "float", "bool"],
    ["int", Operation.LESS_EQUALS, "float", "bool"],
    ["int", Operation.GRATER, "float", "bool"],
    ["int", Operation.GREATER_EQUALS, "float", "bool"],

    ["float", Operation.COMPARISON, "int", "bool"],
    ["float", Operation.NOT_COMPARISON, "int", "bool"],
    ["float", Operation.LESS, "int", "bool"],
    ["float", Operation.LESS_EQUALS, "int", "bool"],
    ["float", Operation.GRATER, "int", "bool"],
    ["float", Operation.GREATER_EQUALS, "int", "bool"],

    ["bool", Operation.COMPARISON, "bool", "bool"],
    ["bool", Operation.NOT_COMPARISON, "bool", "bool"],
    ["bool", Operation.AND, "bool", "bool"],
    ["bool", Operation.OR, "bool", "bool"],

    ["bool", Operation.BIT_AND, "bool", "bool"],
    ["bool", Operation.BIT_OR, "bool", "bool"],
    ["bool", Operation.XOR, "bool", "bool"],

    ["int", Operation.BIT_AND, "int", "int"],
    ["int", Operation.BIT_OR, "int", "int"],
    ["int", Operation.XOR, "int", "int"],
    ["int", Operation.SHIFT_LEFT, "int", "int"],
    ["int", Operation.SHIFT_RIGHT, "int", "int"],

    ["string", Operation.ADDITION, "string", "string"],

    ["string", Operation.COMPARISON, "string", "bool"],
    ["string", Operation.NOT_COMPARISON, "string", "bool"]
];

const UNARY_CASES: [Operation, Type, Type][] = [
    [Operation.BIT_NOT, "int", "int"],
    [Operation.ADDITION, "int", "int"],
    [Operation.SUBTRACTION, "int", "int"],

    [Operation.ADDITION, "float", "float"],
    [Operation.SUBTRACTION, "float", "float"],

    [Operation.NOT, "bool", "bool"]
]

export class Binder {
    private readonly statements: Statement[];
    private scope: Scope;
    public diagnostics: Diagnostic[];
    private readonly filename: string;


    public static bindProgram(filename: string, text: string): Binder {
        const parser: Parser = new Parser(filename, text);

        if (parser.diagnostics.length != 0) {
            return new Binder(filename, null, parser.diagnostics);
        }

        const statements: Statement[] = parser.parse();

        return new Binder(filename, statements, parser.diagnostics);
    }

    public constructor(filename: string, statements: Statement[], diagnostics: Diagnostic[]) {
        this.filename = filename;
        this.statements = statements;
        this.diagnostics = diagnostics;
        this.scope = new Scope(null);
    }

    public get program(): BoundProgram {
        const statements: BoundStatement[] = this.bindStatements(this.statements);

        return new BoundProgram(statements);
    }

    private bindStatements(statements: Statement[]): BoundStatement[] {
        const boundStatements: BoundStatement[] = [];

        for (let statement of statements) {
            boundStatements.push(this.bindStatement(statement));
        }

        return boundStatements;
    }

    private bindStatement(statement: Statement): BoundStatement {
        switch (statement.type) {
            case SyntaxType.VARIABLE_DECLARATION_STATEMENT:
                return this.bindVariableDeclarationStatement(statement as VariableDeclarationStatement);
            case SyntaxType.CALL_STATEMENT:
                break;
        }
    }

    private bindVariableDeclarationStatement(statement: VariableDeclarationStatement): BoundStatement {
        const type: Type = this.bindType(statement.typeToken);
        const value: BoundExpression = this.bindExpression(statement.value, type);
        const symbol: Symbol = {
            type: SymbolType.VARIABLE,
            kind: type,
            name: "$" + statement.name.text
        }

        this.scope.declareSymbol(symbol);
        return new BoundVariableDeclarationStatement(symbol, value);
    }

    private bindType(token: Token): Type {
        switch (token.text) {
            case "int":
                return "int";
            case "float":
                return "float";
            case "string":
                return "string";
            case "bool":
                return "bool";
            case "any":
                return "any";
        }

        this.diagnostics.push({
            pos: token.span,
            file: this.filename,
            message: `SyntaxError: Unknown type '${token.text}'`
        });
        return "any";
    }

    private bindExpression(expression: Expression, type: Type = "any"): BoundExpression {
        const boundExpression = this.bindExpressionInternal(expression);
        if (type == "any") {
            return boundExpression;
        }

        if (boundExpression.kind != type) {
            this.diagnostics.push({
                pos: expression.span,
                file: this.filename,
                message: `SyntaxError: Expression return '${boundExpression.type}' but required is '${type}'`
            });
        }

        return boundExpression;
    }

    private bindExpressionInternal(expression: Expression): BoundExpression {
        switch (expression.type) {
            case SyntaxType.PATH_EXPRESSION:
                break;
            case SyntaxType.BINARY_EXPRESSION:
                return this.bindBinaryExpression(expression as BinaryExpression);
            case SyntaxType.UNARY_EXPRESSION:
                return this.bindUnaryExpression(expression as UnaryExpression);
            case SyntaxType.LITERAL_EXPRESSION:
                return this.bindLiteralExpression(expression as LiteralExpression);
                break;
            case SyntaxType.VARIABLE_ACCESS_EXPRESSION:
                break;
        }
    }

    private bindBinaryExpression(expression: BinaryExpression): BoundExpression {
        const left: BoundExpression = this.bindExpression(expression.left);
        const right: BoundExpression = this.bindExpression(expression.right);

        const operator: Operation = this.bindOperator(expression.operator);
        let returnType: Type | false = this.bindBinaryOperation(left, operator, right);
        if (!returnType) {
            this.diagnostics.push({
                pos: expression.span,
                file: this.filename,
                message: `SyntaxError: Cannot use type '${left.kind}' and type '${right.kind}' in a binary operation`
            });
            returnType = "any";
        }
        return new BoundBinaryExpression(left, operator, right, returnType);
    }

    private bindUnaryExpression(expression: UnaryExpression): BoundExpression {
        const right: BoundExpression = this.bindExpression(expression.right);
        const operator: Operation = this.bindOperator(expression.operator);
        let returnType: Type | false = this.bindUnaryOperation(operator, right);
        if (!returnType) {
            this.diagnostics.push({
                pos: expression.span,
                file: this.filename,
                message: `SyntaxError: Cannot use type '${right.kind}' in a unary operation`
            });
            returnType = "any";
        }
        return new BoundUnaryExpression(operator, right, returnType);
    }

    private bindLiteralExpression(expression: LiteralExpression): BoundExpression {
        return new BoundLiteralExpression(expression.token.value);
    }

    private bindOperator(token: Token): Operation {
        switch (token.type) {
            case TokenType.DOUBLE_EQUALS:
                return Operation.COMPARISON;
            case TokenType.GREATER:
                return Operation.GRATER;
            case TokenType.DOUBLE_GREATER:
                return Operation.SHIFT_RIGHT;
            case TokenType.GREATER_EQUALS:
                return Operation.GREATER_EQUALS;
            case TokenType.LESS:
                return Operation.LESS;
            case TokenType.DOUBLE_LESS:
                return Operation.SHIFT_LEFT;
            case TokenType.LESS_EQUALS:
                return Operation.LESS_EQUALS;
            case TokenType.EXCLAMATION:
                return Operation.NOT;
            case TokenType.EXCLAMATION_EQUALS:
                return Operation.NOT_COMPARISON;
            case TokenType.PLUS:
                return Operation.ADDITION;
            case TokenType.MINUS:
                return Operation.SUBTRACTION;
            case TokenType.STAR:
                return Operation.MULTIPLICATION;
            case TokenType.AND:
                return Operation.BIT_AND;
            case TokenType.DOUBLE_AND:
                return Operation.AND;
            case TokenType.SPLIT:
                return Operation.BIT_OR;
            case TokenType.DOUBLE_SPLIT:
                return Operation.OR;
            case TokenType.HAT:
                return Operation.XOR;
            case TokenType.TILDE:
                return Operation.BIT_NOT;
            case TokenType.PERCENT:
                return Operation.MODULE;
            case TokenType.SLASH:
                return Operation.DIVISION;
        }

        throw `Undefined operator '${token.text}'`;
    }

    private bindBinaryOperation(left: BoundExpression, operator: Operation, right: BoundExpression): Type | false {
        for (let c of BINARY_CASES) {
            if (c[1] != operator) {
                continue;
            }

            if (c[0] != left.kind) {
                continue;
            }

            if (c[2] != right.kind) {
                continue;
            }

            return c[3];
        }

        return false;
    }

    private bindUnaryOperation(operator: Operation, right: BoundExpression): Type | false {
        for (let c of UNARY_CASES) {
            if (c[0] != operator) {
                continue;
            }

            if (c[1] != right.kind) {
                continue;
            }

            return c[2];
        }

        return false;
    }
}