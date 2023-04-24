import {Color, print, println, readline} from "./stdio";
import {FunctionContainer, Platform} from "./platform";
import * as path from "path";
import {Diagnostic} from "../lang/lexer";
import {Binder, BoundProgram} from "../lang/binder";
import {Interpreter} from "../lang/interpreter";

if (process.argv.length > 2) {
    // TODO Execute script files given as a parameter
    // Helix should try to execute a script file given as a parameter.
    // When the argument is not a path of the current filesystem, the string will be interpreted as the script
}

function translate_path(platform: Platform, str: string): string {
    str = path.join(str);
    const prefix = path.join(platform.homedir);
    if (str.toLowerCase().startsWith(prefix.toLowerCase())) {
        return "~" + str.substring(prefix.length).replace(/\\/g, "/");
    }

    str = str.replace(/\\/g, "/");

    return str;
}

function print_diagnostics(diagnostics: Diagnostic[]): void {
    diagnostics.forEach(value => {
        // TODO Improve output messages
        // The diagnostic should show the line and col number from the begin of the error to the end.
        // Also a the first line of the error-code should be outputted.
        println(`${value.file}:(${value.pos.start}:${value.pos.end}) ${value.message}`, Color.RED);
    });
}

async function loop() {
    const platform: Platform = Platform.get_platform();
    if (!platform) {
        println("Could not detect platform");
        process.exit(1);
    }

    const container: FunctionContainer = platform.loadContainer();

    while (1) {
        print(platform.username + "@" + platform.hostname, Color.GREEN);
        print(":");
        print(translate_path(platform, process.cwd()), Color.BLUE);
        if (platform.isAdmin) {
            print("# ");
        } else {
            print("$ ");
        }
        const line: string = await readline();
        const binder: Binder = Binder.bindProgram("<stdin>", line);
        if (binder.diagnostics.length != 0) {
            print_diagnostics(binder.diagnostics);
            continue;
        }

        const program: BoundProgram = binder.program;
        if (binder.diagnostics.length != 0) {
            print_diagnostics(binder.diagnostics);
            continue;
        }

        // println(JSON.stringify(program.statements, null, 4));
        const interpreter: Interpreter = new Interpreter(platform);
        interpreter.interpret(program, container);
    }
}

loop().then(() => process.exit(0));