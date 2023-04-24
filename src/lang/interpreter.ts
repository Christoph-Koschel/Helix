import {
    BoundBinaryExpression,
    BoundCallStatement,
    BoundCastExpression,
    BoundExpression,
    BoundLiteralExpression,
    BoundProgram,
    BoundStatement,
    BoundType,
    BoundUnaryExpression,
    BoundVariableAccessExpression,
    BoundVariableDeclarationStatement,
    Operation
} from "./binder";
import {FunctionContainer, Platform} from "../core/platform";
import {Color, println} from "../core/stdio";
import * as path from "path";

export type Scope = {
    variables: { [name: string]: any }
    functions: { [name: string]: BoundStatement[] }
}

export class Interpreter {
    private scope: Scope[]
    private platform: Platform;
    private nativeFunctions: FunctionContainer;

    public constructor(platform: Platform) {
        this.scope = [];
        this.platform = platform;
    }

    public interpret(program: BoundProgram, nativeFunctions: FunctionContainer): void {
        this.nativeFunctions = nativeFunctions;
        this.scope.push({
            variables: {},
            functions: {}
        });

        this.interpretStatements(program.statements);
    }

    public interpretStatements(statements: BoundStatement[]): void {
        for (let statement of statements) {
            this.interpretStatement(statement);
        }
    }

    public interpretStatement(statement: BoundStatement): void {
        switch (statement.type) {
            case BoundType.VARIABLE_DECLARATION_STATEMENT:
                this.interpretVariableDeclarationStatement(statement as BoundVariableDeclarationStatement);
                break;
            case BoundType.CALL_STATEMENT:
                this.interpretCallStatement(statement as BoundCallStatement);
                break;
        }
    }

    private interpretVariableDeclarationStatement(statement: BoundVariableDeclarationStatement): void {
        this.scope[this.scope.length - 1].variables[statement.variable.name] = this.interpretExpression(statement.value);
    }

    private interpretCallStatement(statement: BoundCallStatement): void {
        let caller: string = this.interpretExpression(statement.caller);
        let parameters: any[] = [];
        statement.parameters.forEach(parameter => {
            parameters.push(this.interpretExpression(parameter));
        });

        if (path.basename(caller) == caller) {
            if (this.nativeFunctions.has(caller)) {
                this.nativeFunctions.exec(caller, parameters);
                return;
            }
        }

        println(`RuntimeError: '${caller}' is not a function, script or path to an executable`, Color.RED);
    }

    private interpretExpression(expression: BoundExpression): any {
        switch (expression.type) {
            case BoundType.BINARY_EXPRESSION:
                return this.interpretBinaryExpression(expression as BoundBinaryExpression);
            case BoundType.UNARY_EXPRESSION:
                return this.interpretUnaryExpression(expression as BoundUnaryExpression);
            case BoundType.LITERAL_EXPRESSION:
                return (<BoundLiteralExpression>expression).value;
            case BoundType.VARIABLE_ACCESS_EXPRESSION:
                return this.interpretVariableAccessExpression(expression as BoundVariableAccessExpression);
            case BoundType.CAST_EXPRESSION:
                return this.interpretCastExpression(expression as BoundCastExpression);
        }
    }

    private interpretBinaryExpression(expression: BoundBinaryExpression): any {
        const left: any = this.interpretExpression(expression.left);
        const right: any = this.interpretExpression(expression.right);

        switch (expression.operator) {
            case Operation.ADDITION:
                return left + right;
            case Operation.SUBTRACTION:
                return left - right;
            case Operation.MULTIPLICATION:
                return left * right;
            case Operation.DIVISION:
                return left / right;
            case Operation.MODULE:
                return left % right;
            case Operation.AND:
                return left && right;
            case Operation.OR:
                return left || right;
            case Operation.BIT_AND:
                return left & right;
            case Operation.BIT_OR:
                return left | right;
            case Operation.SHIFT_RIGHT:
                return left >> right;
            case Operation.SHIFT_LEFT:
                return left << right;
            case Operation.XOR:
                return left ^ right;
            case Operation.GRATER:
                return left > right;
            case Operation.GREATER_EQUALS:
                return left >= right;
            case Operation.LESS:
                return left < right;
            case Operation.LESS_EQUALS:
                return left <= right;
            case Operation.COMPARISON:
                return left == right;
            case Operation.NOT_COMPARISON:
                return left != right;
        }
    }

    private interpretUnaryExpression(expression: BoundUnaryExpression): any {
        const right: any = this.interpretExpression(expression.right);

        switch (expression.operator) {
            case Operation.ADDITION:
                return +right;
            case Operation.SUBTRACTION:
                return -right;
            case Operation.BIT_NOT:
                return ~right;
            case Operation.NOT:
                return !right;

        }
    }

    private interpretVariableAccessExpression(expression: BoundVariableAccessExpression): any {
        for (let scope of this.scope) {
            if (Object.keys(scope.variables).includes(expression.variable.name)) {
                return scope.variables[expression.variable.name];
            }
        }

        // The program should not come to this point because we check the variable existence in the binder
        throw "";
    }

    private interpretCastExpression(expression: BoundCastExpression): any {
        const value: number = this.interpretExpression(expression.expression);
        return ~~value;
    }
}