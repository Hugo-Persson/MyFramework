import "module-alias/register";
import Core from "@lib/Core";
import Initialize from "@lib/Initialize";

class Start extends Initialize {
    core: Core;
    constructor() {
        super();
        this.core = new Core(this);
    }
    postStart() {
        console.log("Server up and running");
    }

    noPageFound() {
        this.res.send("404 and heartbreak");
    }
    indexAction() {
        this.res.sendFile(process.cwd()+"/resources/index.html");
    }
}
new Start();