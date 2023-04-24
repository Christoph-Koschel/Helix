import * as os from "os";

const stdout = process.stdout;
const stdin = process.stdin;

export const TAB: string = "    ";
export const DOUBLE_TAB: string = TAB.repeat(2);

export enum Color {
    BLACK = "\x1B[0;30m",
    RED = "\x1B[0;31m",
    GREEN = "\x1B[0;32m",
    YELLOW = "\x1B[0;33m",
    BLUE = "\x1B[0;34m",
    PURPLE = "\x1B[0;35m",
    CYAN = "\x1B[0;36m",
    WHITE = "\x1B[0;37m",
    RESET = "\x1B[0;0m"
}

export function print(str: string, color?: Color): void {
    if (color) {
        stdout.write(color);
    }

    stdout.write(str);

    if (color) {
        stdout.write(Color.RESET);
    }
}

export function println(str: string, color?: Color): void {
    print(str, color);
    print(os.EOL);
}

export async function readline(): Promise<string> {
    return new Promise((resolve) => {
        // TODO Implement autocompletion when pressing TAB
        // TODO readline is not working correctly under linux
        // Under linux the readline method don't detects when a input is finished (when enter was pressed).
        // labels: bug

        stdin.once("data", line => {
            resolve(line.toString("utf-8"));
        });
    });
}

export function colorize(str: string, color: Color): string {
    return color + str + Color.RESET;
}