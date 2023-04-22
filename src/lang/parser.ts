import {Diagnostic, Lexer, span_from, Token, TokenType} from "./lexer";

export enum SyntaxType {
    PATH_EXPRESSION = "PATH_EXPRESSION",
    BINARY_EXPRESSION = "BINARY_EXPRESSION",
    UNARY_EXPRESSION = "UNARY_EXPRESSION",
    LITERAL_EXPRESSION = "LITERAL_EXPRESSION"
}

export abstract class Expression {
    public type: SyntaxType;

    protected constructor(type: SyntaxType) {
        this.type = type;

    }
}

export class PathExpression extends Expression {
    public parts: Token[];

    public constructor(parts: Token[]) {
        super(SyntaxType.PATH_EXPRESSION);
        this.parts = parts;
    }
}

export class BinaryExpression extends Expression {
    public left: Expression;
    public operator: Token;
    public right: Expression;

    public constructor(left: Expression, operator: Token, right: Expression) {
        super(SyntaxType.BINARY_EXPRESSION);
        this.left = left;
        this.operator = operator;
        this.right = right;
    }
}

export class UnaryExpression extends Expression {
    public operator: Token;
    public right: Expression;

    public constructor(operator: Token, right: Expression) {
        super(SyntaxType.UNARY_EXPRESSION);
        this.operator = operator;
        this.right = right;
    }
}

export class LiteralExpression extends Expression {
    public token: Token;

    public constructor(token: Token) {
        super(SyntaxType.LITERAL_EXPRESSION);
        this.token = token;
    }
}

function get_unary_precedence(type: TokenType): number {
    switch (type) {
        case TokenType.MINUS:
        case TokenType.PLUS:
        // case TokenType.NOT:
        case TokenType.TILDE:
            return 4;
    }

    return 0;
}

function get_binary_precedence(type: TokenType): number {
    switch (type) {
        case TokenType.STAR:
        case TokenType.SLASH:
        case TokenType.PERCENT:
            return 5;
        case TokenType.PLUS:
        case TokenType.MINUS:
            return 3;
        case TokenType.AND:
        case TokenType.DOUBLE_AND:
            return 2;
        case TokenType.SPLIT:
        case TokenType.DOUBLE_SPLIT:
        case TokenType.HAT:
            return 1;
    }

    return 0;
}


export class Parser {
    private readonly filename: string;
    public diagnostics: Diagnostic[];
    public tokens: Token[];
    private pos: number = 0;

    public constructor(filename: string, text: string) {
        const lexer: Lexer = new Lexer(filename, text);
        let token: Token;
        let lastType: TokenType = TokenType.BAD;
        const tokens: Token[] = [];

        do {
            token = lexer.lex();
            if (token.type != TokenType.BAD) {

                // Reduce all newline blocks to contain only one newline token
                // [NEWLINE, NEWLINE] => [NEWLINE]
                // [NEWLINE, NEWLINE, NEWLINE] => [NEWLINE]
                // ....
                if (!(token.type == TokenType.NEWLINE && lastType == TokenType.NEWLINE)) {
                    tokens.push(token);
                }
                lastType = token.type;
            }
        } while (token.type != TokenType.EOF);

        this.filename = filename;
        this.tokens = tokens;
        this.diagnostics = lexer.diagnostics;
        this.pos = 0;
    }

    private get current(): Token {
        if (this.pos >= this.tokens.length) {
            return this.tokens[this.tokens.length - 1];
        }

        return this.tokens[this.pos];
    }

    private get next(): Token {
        if (this.pos >= this.tokens.length) {
            return this.tokens[this.tokens.length - 1];
        }

        return this.tokens[this.pos++];
    }

    private get next_useful(): Token {
        let token: Token = this.tokens[this.pos++];
        while (this.current.type == TokenType.NEWLINE || this.current.type == TokenType.WHITESPACE) {
            this.pos++;
        }

        return token;
    }

    private peek(offset: number): Token {
        if (this.pos + offset >= this.tokens.length) {
            return this.tokens[this.tokens.length - 1];
        }

        return this.tokens[this.pos + offset];
    }

    private match(...types: TokenType[]): Token {
        let type = this.current.type;
        for (let t of types) {
            if (t == type) {
                return this.next;
            }
        }

        this.diagnostics.push({
            pos: this.current.span,
            file: this.filename,
            message: `ParsingError: Unexpected Token '${type}' expected: ${types.map(t => "<" + t + ">").join(", ")}`
        });

        this.pos++;
        return {
            type: TokenType.BAD,
            text: "",
            span: span_from(0, 0),
            value: null
        }
    }

    private match_useful(...types: TokenType[]): Token {
        let type = this.current.type;
        for (let t of types) {
            if (t == type) {
                return this.next_useful;
            }
        }

        this.diagnostics.push({
            pos: this.current.span,
            file: this.filename,
            message: `ParsingError: Unexpected Token '${type}' expected: ${types.map(t => "<" + t + ">").join(", ")}`
        });

        this.pos++;
        return {
            type: TokenType.BAD,
            text: "",
            span: span_from(0, 0),
            value: null
        }
    }

    public parse(): Expression[] {
        const exprs: Expression[] = [];
        while (this.pos < this.tokens.length) {
            if (this.current.type == TokenType.NEWLINE || this.current.type == TokenType.WHITESPACE) {
                this.next_useful;
            }

            if (this.current.type == TokenType.EOF) {
                break;
            }

            const expr: Expression = this.parse_expr();
            if (expr != null) {
                exprs.push(expr);
            }
        }

        return exprs;
    }

    private parse_expr(): Expression {
        if (this.current.type == TokenType.DOT ||
            this.current.type == TokenType.IDENTIFIER && this.current.text.length == 1 && this.peek(1).type == TokenType.COLON && (this.peek(2).type == TokenType.SLASH || this.peek(2).type == TokenType.BACKSLASH) ||
            this.current.type == TokenType.SLASH ||
            this.current.type == TokenType.BACKSLASH ||
            this.current.type == TokenType.IDENTIFIER) {
            return this.parse_path_expr();
        }

        return this.parse_binary_expr();
    }

    private parse_binary_expr(parent_precedence: number = 0): Expression {
        let left: Expression;
        let unaryIndex: number = get_unary_precedence(this.current.type);
        if (unaryIndex != 0 && unaryIndex >= parent_precedence) {
            let operatorToken: Token = this.next_useful;
            let right: Expression = this.parse_binary_expr(unaryIndex);
            left = new UnaryExpression(operatorToken, right);
        } else {
            left = this.parse_literal();
        }

        while (true) {
            let index = get_binary_precedence(this.current.type);
            if (index == 0 || index <= parent_precedence) {
                break;
            }

            let operatorToken: Token = this.next_useful;
            let right: Expression = this.parse_binary_expr(index);
            left = new BinaryExpression(left, operatorToken, right);
        }

        return left;
    }

    private parse_literal(): Expression {
        const token: Token = this.match_useful(TokenType.INT, TokenType.FLOAT, TokenType.STRING);
        return new LiteralExpression(token);
    }

    private parse_path_expr(): Expression {
        const parts: Token[] = [];

        if (this.current.type == TokenType.IDENTIFIER && this.current.text.length == 1 && this.peek(1).type == TokenType.COLON && (this.peek(2).type == TokenType.SLASH || this.peek(2).type == TokenType.BACKSLASH)) {
            parts.push(this.next);
            parts.push(this.next);
        }
        parts.push(this.next);

        while (this.current.type != TokenType.WHITESPACE) {
            parts.push(this.match(TokenType.DOT, TokenType.SLASH, TokenType.BACKSLASH, TokenType.IDENTIFIER));
        }

        return new PathExpression(parts);
    }
}