import {Color, print, println, readline} from "./stdio";
import {Platform} from "./platform";
import * as path from "path";

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
    }
}

loop().then(() => process.exit(0));