import * as os from "os";
import * as child_process from "child_process";

export abstract class Platform {
    public static get_platform(): Platform | null {
        switch (os.platform()) {
            case "linux":
                // TODO Add Linux Platform Information
                break;
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

    public abstract get username(): string;

    public abstract get hostname(): string;

    public abstract get homedir(): string;

    public abstract get isAdmin(): boolean;

}

export class Windows extends Platform {
    private isAdminBox: number = -1;

    get homedir(): string {
        return os.homedir();
    }

    get isAdmin(): boolean {
        if (this.isAdminBox == -1) {
            try {
                child_process.execSync("net session", {
                    windowsHide: true
                });
                this.isAdminBox = 1;
                return false;
            } catch {
                this.isAdminBox = 0;
                return false;
            }
        }
        return this.isAdminBox == 1;
    }

    get username(): string {
        return os.userInfo({encoding: "utf-8"}).username;
    }

    get hostname(): string {
        return os.hostname();
    }
}