import "module-alias/register";
import Core from "@lib/Core";
import Initialize from "@lib/Initialize";
import { GET } from "@lib/Controller";

class Start extends Initialize {
    core: Core;

    constructor() {
        super();

        this.core = new Core(this, true);
    }
    async postStart(port: number) {
        console.log("Server up and running on port " + port);
    }
    @GET
    async noPageFound() {
        this.res.send("404 and heartbreak");
    }
    @GET
    indexAction() {
        this.res.sendFile(process.cwd() + "/resources/index.html");
    }
}
new Start();
