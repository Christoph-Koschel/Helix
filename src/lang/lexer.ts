export enum TokenType {
    NEWLINE = "NEWLINE",
    WHITESPACE = "WHITESPACE",
    IDENTIFIER = "IDENTIFIER",
    SLASH = "SLASH",
    POINT = "POINT",
    STRING = "STRING",
    INT = "INT",
    FLOAT = "FLOAT",
    EOF = "EOF",
    BAD = "BAD",
}

export type Span = {
    start: number;
    length: number;
    end: number;
}

export type Token = {
    text: string;
    value: any;
    span: Span;
    type: TokenType;
}

export type Diagnostic = {
    message: string;
    file: string;
    pos: Span;
}

export function span_from(start: number, end: number): Span {
    return {
        start: start,
        end: end,
        length: end - start
    }
}

export function isDigit(c: string): boolean {
    return c >= '0' && c <= '9';

}

export function isAlpha(c: string): boolean {
    return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z';
}

export function isWhitespace(c: string): boolean {
    return c == '\t' || c == ' ' || c == "\r";
}

export class Lexer {
    private readonly filename: string;
    private text: string;
    private pos: number;
    public readonly diagnostics: Diagnostic[];

    public constructor(filename: string, text: string) {
        this.filename = filename;
        this.text = text;
        this.pos = 0;
        this.diagnostics = [];
    }

    private get current(): string | "\0" {
        if (this.pos >= this.text.length) {
            return '\0';
        }

        return this.text.charAt(this.pos);
    }

    private get next(): string {
        if (this.pos >= this.text.length) {
            return '\0';
        }

        return this.text.charAt(this.pos++);
    }

    public lex(): Token {
        if (this.pos >= this.text.length) {
            return {
                text: "",
                value: null,
                type: TokenType.EOF,
                span: {
                    end: this.pos,
                    start: this.pos,
                    length: 0
                }
            }
        }

        let start: number = this.pos;
        let type: TokenType;
        let text: string;
        let value: any;

        switch (this.current) {
            case "/":
                text = "/";
                value = null;
                type = TokenType.SLASH;
                this.pos++;
                break;
            case ".":
                text = ".";
                value = null;
                type = TokenType.POINT;
                this.pos++;
                break;
            case "\n":
                text = "\n";
                value = null;
                type = TokenType.NEWLINE;
                this.pos++;
                break;
            default:
                if (this.current == '"') {
                    text = this.next;
                    // @ts-ignore
                    while (!(this.current == '\0' || this.current == '"')) {
                        text += this.next;
                    }

                    // @ts-ignore
                    if (this.current == '\0') {
                        this.diagnostics.push({
                            pos: span_from(start, this.pos),
                            file: this.filename,
                            message: "SyntaxError: Unterminated string"
                        });
                        return {
                            text: text,
                            value: null,
                            type: TokenType.BAD,
                            span: span_from(start, this.pos)
                        };
                    } else {
                        text += this.next;
                    }

                    type = TokenType.STRING;
                    value = text.substring(1, text.length - 1);
                } else if (isDigit(this.current)) {
                    let pointCounter: number = 0;
                    text = this.next;
                    while (isDigit(this.current) || this.current == ".") {
                        if (this.current == ".") {
                            pointCounter++;
                            if (pointCounter > 1) {
                                break;
                            }
                        }

                        text += this.next;
                    }

                    if (pointCounter == 1) {
                        type = TokenType.FLOAT;
                        value = parseFloat(text);
                    } else {
                        type = TokenType.INT;
                        value = parseInt(text);
                    }
                } else if (isAlpha(this.current)) {
                    text = this.next;
                    while (isAlpha(this.current) || this.current == "_") {
                        text += this.next;
                    }
                    type = TokenType.IDENTIFIER;
                } else if (isWhitespace(this.current)) {
                    text = this.next;
                    while (isWhitespace(this.current)) {
                        text += this.next;
                    }
                    type = TokenType.WHITESPACE;
                } else {
                    this.diagnostics.push({
                        pos: span_from(start, this.pos + 1),
                        file: this.filename,
                        message: `SyntaxError: Unknown Token '${this.current}'`
                    });
                    type = TokenType.BAD;
                    text = this.next;
                }
        }

        return {
            text: text,
            value: value,
            type: type,
            span: span_from(start, this.pos)
        }
    }
}