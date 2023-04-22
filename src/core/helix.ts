import {Color, print, println, readline} from "./stdio";
import {Platform} from "./platform";
import * as path from "path";
import {Expression, Parser} from "../lang/parser";
import {Diagnostic} from "../lang/lexer";

if (process.argv.length > 2) {
    // TODO Execute script files given as a parameter
    // Helix should try to execute a script file given as a parameter.
    // When the argument is not a path of the current filesystem, the string will be interpreted as the script
}

function translate_path(platform: Platform, str: string): string {
    str = path.join(str);
    const prefix = path.join(platform.homedir);
    if (str.startsWith(prefix)) {
        return "~" + str.substring(prefix.length);
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

    while (1) {
        print(platform.username + "@" + platform.hostname, Color.GREEN);
        print(":");
        print(translate_path(platform, process.cwd()), Color.BLUE);
        if (platform.isAdmin) {
            print("# ");
        } else {
            print("$ ");
        }
        const line = await readline();
        const parser: Parser = new Parser("<stdin>", line);
        parser.tokens.forEach(value => {
            println(`${value.type} (${value.text.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")})`);
        });
        if (parser.diagnostics.length != 0) {
            print_diagnostics(parser.diagnostics);
            continue;
        }
        const exprs: Expression[] = parser.parse();
        if (parser.diagnostics.length != 0) {
            print_diagnostics(parser.diagnostics);
            continue;
        }

        exprs.forEach(value => {
            println(JSON.stringify(value, null, 4));
        });

    }
}

loop().then(() => process.exit(0));