import * as os from "os";
import * as child_process from "child_process";
import * as path from "path";
import {Color, colorize, DOUBLE_TAB, println, print, TAB} from "./stdio";
import * as fs from "fs";

export type FunctionEntry = { (args: any[]): number }
export type ContainerItem = {
    exec: FunctionEntry;
    man: { (): boolean }
}

export class FunctionContainer {
    private functions: Map<string, ContainerItem>;

    public constructor() {
        this.functions = new Map<string, ContainerItem>();
    }

    public add(name: string, cb: ContainerItem): void {
        this.functions.set(name, cb);
    }

    public has(name: string): boolean {
        return this.functions.has(name);
    }

    public exec(name: string, args: any[]): number {
        return this.functions.get(name).exec(args);
    }

    public man(name: string): boolean {
        return this.functions.get(name).man();
    }
}

export abstract class Platform {
    public static get_platform(): Platform | null {
        switch (os.platform()) {
            case "linux":
                return new Linux();
            case "cygwin":
            case "win32":
                return new Windows();
            case "darwin":
                // TODO Add MacOS Platform Information
                break;
            case "openbsd":
            case "freebsd":
            case "netbsd":
                // TODO Maybe add BSD Platform Information
                break;

        }

        return null;
    }

    protected static isWindows(platform: Platform): boolean {
        return platform instanceof Windows;
    }

    protected static isLinux(platform: Platform): boolean {
        return platform instanceof Linux;
    }

    public abstract get username(): string;

    public abstract get hostname(): string;

    public abstract get homedir(): string;

    public abstract get isAdmin(): boolean;

    public abstract translatePath(p: string): string;

    public loadContainer(): FunctionContainer {
        const container: FunctionContainer = new FunctionContainer();

        container.add("echo", {
            exec: args => {
                let newLine: boolean = true;
                let output: string[] = [];

                for (let arg of args) {
                    if (arg == "-n") {
                        newLine = false;
                    }

                    output.push(arg);
                }

                output.forEach(value => newLine ? println(value) : print(value));
                return 0;
            },
            man: () => {
                println("NAME");
                println(TAB + "echo - display a lines of text");
                println("");
                println("SYNOPSIS");
                println(TAB + "echo [OPTION]... [STRING]...");
                println("");
                println("DESCRIPTION");
                println(TAB + "Echo the STRINGs to standard output.");
                println("");
                println(TAB + "-n");
                println(DOUBLE_TAB + "do not output th trailing newline");
                return true;
            }
        });

        container.add("cd", {
            exec: args => {
                if (args.length != 1) {
                    println("RuntimeError: cd: To many arguments", Color.RED);
                    return 1;
                }
                const p: string = this.translatePath(args[0]);

                if (!fs.existsSync(p)) {
                    println("RuntimeError: cd: Directory or File not found", Color.RED);
                    return 1;
                }
                if (!fs.statSync(p).isDirectory()) {
                    println(`RuntimeError: cd: '${p}' is not a directory`, Color.RED);
                    return 1;
                }

                process.chdir(p);
                return 0;
            },
            man: () => {
                return false;
            }
        });

        container.add("ls", {
            exec: args => {
                let all: boolean = false;
                let ignoreBackups: boolean = false;
                let longListing: boolean = false;
                let dir: string = ".";

                for (let arg of args) {
                    if (arg == "-a" || arg == "--all") {
                        all = true;
                    } else if (arg == "-B" || arg == "--ignore-backups") {
                        ignoreBackups = true;
                    } else if (arg == "-l") {
                        longListing = true;
                    } else {
                        dir = arg;
                    }
                }


                let entry: string[] = fs.readdirSync(path.join(process.cwd(), dir));

                entry = entry.filter(value => {
                    if (!all && value.startsWith(".")) {
                        return false;
                    }

                    if (ignoreBackups) {
                        if (fs.statSync(path.join(process.cwd(), dir, value)).isFile() && value.endsWith("~")) {
                            return false;
                        }
                    }

                    return true;
                });

                let longest: number = 0;
                entry.forEach(value => longest = fs.statSync(path.join(process.cwd(), dir, value)).size > longest ? fs.statSync(path.join(process.cwd(), dir, value)).size : longest);
                longest = longest.toString().length;

                println(entry.map(value => {
                    const stat: fs.Stats = fs.statSync(path.join(process.cwd(), dir, value));

                    if (longListing) {
                        let line: string = `${stat.isDirectory() ? "d" : stat.isFile() ? "-" : stat.isBlockDevice() ? "b" : stat.isSocket() ? "s" : stat.isSymbolicLink() ? "l" : stat.isCharacterDevice() ? "c" : stat.isFIFO() ? "p" : "-"}`;
                        if (Platform.isWindows(this)) {
                            line += "---"
                        } else {
                            line += (stat.mode & 0o777).toString().replace(/0/gi, "-");
                        }

                        line += " " + stat.mtime.toUTCString();
                        line += " " + stat.size.toString().padStart(longest);
                        line += " " + (stat.isDirectory() ? colorize(value, Color.BLUE) : value);
                        return line;
                    } else {
                        if (stat.isDirectory()) {
                            return colorize(value, Color.BLUE);
                        }

                        return value;
                    }
                }).join(longListing ? "\n" : " "));
                return 0;
            },
            man: () => {
                println("NAME");
                println(TAB + "ls - list directory contents");
                println("");
                println("SYNOPSIS");
                println(TAB + "ls [OPTION]... [FILE]");
                println("");
                println("DESCRIPTION");
                println(TAB + "List information about the FILE (the current directory by default). Sort entries alphabetically if --sort is not specified.");
                println("");
                println(TAB + "Mandatory arguments to long options are mandatory for short options too.");
                println("");
                println(TAB + "-a, --all");
                println(DOUBLE_TAB + "do not ignore entries starting with .");
                println("");
                println(TAB + "-B, --ignore-backups");
                println(DOUBLE_TAB + "do not list implied entries ending with ~");
                println("");
                println(TAB + "-l");
                println(DOUBLE_TAB + "use a long listing format");
                return true;
            }
        });

        container.add("man", {
            exec: args => {
                if (args.length < 1) {
                    println("RuntimeError: man: To few arguments", Color.RED);
                    return 1;
                }
                if (args.length > 1) {
                    println("RuntimeError: man: To many arguments", Color.RED);
                    return 1;
                }
                const page: string = args[0];
                if (container.has(page)) {
                    if (!container.man(page)) {
                        println(`RuntimeError: man: No page for '${page}' found`, Color.RED);
                        return 1;
                    }
                } else {
                    println(`RuntimeError: man: No page for '${page}' found`, Color.RED);
                    return 1;
                }

                return 0;
            },
            man: () => {
                println("NAME");
                println(TAB + "man - an interface to the system reference manuals");
                println("");
                println("SYNOPSIS");
                println(TAB + "man [PAGE]");
                println("");
                println("DESCRIPTION");
                println(TAB + "man is the helix internal system's manual pager.");
                return true;
            }
        });

        return container;
    }
}

export class Windows extends Platform {
    private isAdminBox: number = -1;

    get homedir(): string {
        return os.homedir();
    }

    get username(): string {
        return os.userInfo({encoding: "utf-8"}).username;
    }

    get hostname(): string {
        return os.hostname();
    }

    get isAdmin(): boolean {
        if (this.isAdminBox == -1) {
            try {
                child_process.execSync("net session", {
                    windowsHide: true,
                    stdio: "ignore"
                });
                this.isAdminBox = 1;
                return true;
            } catch {
                this.isAdminBox = 0;
                return false;
            }
        }
        return this.isAdminBox == 1;
    }

    public translatePath(p: string): string {
        if (p.substring(1).startsWith(":")) {
            return path.join(p);
        } else if (p.startsWith("/") || p.startsWith("\\")) {
            const char: string = process.cwd().charAt(0);
            return path.join(char + ":" + p);
        }

        return path.join(process.cwd(), p);
    }
}

export class Linux extends Platform {
    private isAdminBox: number = -1;

    get homedir(): string {
        return os.homedir();
    }

    get hostname(): string {
        return os.hostname();
    }

    get username(): string {
        return os.userInfo({encoding: "utf-8"}).username;
    }

    get isAdmin(): boolean {
        if (this.isAdminBox == -1) {
            try {
                const output: string = child_process.execSync("id", {
                    windowsHide: true,
                    stdio: "ignore"
                }).toString("utf-8");
                this.isAdminBox = output.match("27(sudo)").length == 1 ? 1 : 0;
                return this.isAdmin;
            } catch {
                this.isAdminBox = 0;
                return false;
            }
        }
        return this.isAdminBox == 1;
    }

    translatePath(p: string): string {
        if (p.startsWith("/") || p.startsWith("\\")) {
            return path.join(p);
        }
        return path.join(process.cwd(), p);
    }


}