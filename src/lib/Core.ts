require("dotenv").config();
import http from "http";
import fs from "fs/promises";
// ---------------------------------- //
import Controller, { ActionType } from "@lib/Controller";
import Initialize from "@lib/Initialize";
import Request from "@lib/Request";
import Response from "@lib/Response";
import { Model } from "@lib/Model";
import { url } from "inspector";

export default class Core {
    private port: number = parseInt(process.env.PORT) || 3000;
    private userEnabledStaticFiles;

    private server: http.Server;
    private initObj: Initialize;
    /**
     * @param {Initialize} init - Your init object
     *
     */
    constructor(init: Initialize, enableStaticFiles = false) {
        this.userEnabledStaticFiles = enableStaticFiles;
        this.initObj = init;
        this.startServer();
    }
    private async startServer(): Promise<void> {
        this.initObj.preStart();
        await Model.startDatabaseConnection();
        this.server = http.createServer(
            { IncomingMessage: Request, ServerResponse: Response },
            this.handleHttpRequest
        );
        this.server.listen(this.port, "localhost", () =>
            this.initObj.postStart(this.port)
        );
    }

    private importController(controller: string): Promise<Controller> {
        return new Promise<Controller>(async (resolve, reject) => {
            const parsedControllerAfterAction = this.parseAction(controller);
            const parsedControllerName =
                parsedControllerAfterAction.charAt(0).toUpperCase() +
                parsedControllerAfterAction.slice(1);

            try {
                var importedFile = await import(
                    `../controllers/${parsedControllerName}Controller`
                ); // eslint-disable-line no-use-before-define

                var ImportedClass = importedFile.default; // eslint-disable-line no-use-before-define
            } catch (error) {
                if (error.code == "MODULE_NOT_FOUND") reject("404");
                else reject(error);
                return;
            }
            if (!ImportedClass) {
                reject("404");
                return;
            }

            if (!(ImportedClass.prototype instanceof Controller)) {
                reject("404");
            }
            const instance = new ImportedClass();

            resolve(instance);
        });
    }

    private handleHttpRequest = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const chunks: Array<string> = req.url.split("/");
        if (await this.getStaticFile(req, res)) return;
        chunks.shift(); // Remove empty element in the start
        let controller: Controller | Initialize;
        let action: string;

        if (chunks[0] == "") {
            // the / route
            controller = this.initObj;

            action = "index-action";
        } else {
            if (chunks.length == 1) {
                chunks.push("index"); // If they don't specify a action then we default it to an index action
            }
            try {
                controller = await this.importController(chunks[0]);
                action = chunks[1];
            } catch (error) {
                if (error == "404") {
                    controller = this.initObj;
                    action = "no-page-found";
                } else {
                    console.log(error);
                    return;
                }
            }
        }

        // I use ts ignore below because I am calling private function and accessing private property
        // @ts-ignore
        req["body"] = await this.parseBody(req);
        // @ts-ignore
        req.parseUrlData();
        // @ts-ignore
        req.parseCookies(); // I need to call it here instead of request constructor because headers are still empty at construction time
        controller.req = req;
        controller.res = res;
        if (
            action == "no-page-found" ||
            !(await controller.runAction(
                this.parseAction(action),
                ActionType[req.method]
            ))
        ) {
            this.initObj.req = controller.req;
            this.initObj.res = controller.res;
            if (!(await this.initObj.runMiddleware())) return;
            await this.initObj.noPageFound();
            //await this.initObj.runAction("noPageFound", ActionType[req.method]); // Parsing action not neccesary
        }
        if (!controller.res.sendingFile) controller.res.end();
    };

    private async getStaticFile(req: Request, res: Response): Promise<boolean> {
        if (this.userEnabledStaticFiles) {
            try {
                const stat = await fs.lstat(
                    process.cwd() + "/public" + req.url
                );

                if (stat.isFile()) {
                    res.sendFile(process.cwd() + "/public/" + req.url);
                    return true;
                } else {
                    return false;
                }
            } catch (error) {
                return false;
            }
        } else {
            return false;
        }
    }
    private async parseBody(req: http.IncomingMessage): Promise<object> {
        return new Promise<object>((resolve, reject) => {
            if (req.headers["content-type"] !== "application/json") {
                resolve({});
                return;
            }
            const body = [];
            req.on("data", (chunk) => {
                body.push(chunk);
            }).on("end", () => {
                resolve(JSON.parse(Buffer.concat(body).toString()));
            });
        });
    }
    private parseAction(action: string) {
        const regex2 = /(?<=-)./g;
        const temp = action
            .toLowerCase()
            .replace(regex2, (s) => s.toUpperCase());
        return temp.split("-").join("");
    }
}
