import http from "http";
import path from "path";
import fs, { ReadStream } from "fs";
import mime from "mime-types";
import View from "./View";

export default class Response {
    private res: http.ServerResponse;
    public sendingFile: boolean = false;
    constructor(res: http.ServerResponse) {
        this.res = res;
    }
    /**
     * @param {string} message - The message you want to send to the user
     * @description - This method will send a string to the user
     */
    send(message: any): void {
        this.res.write(message);
    }
    /**
     * @param {string} absolutePath - The absolute path to the file you want to send to the user
     * @param {string} [mimeType] - The mime-type, if no mime-type is specified an automatic mime-type will be used
     * @description - This method will send a file to the user, use this if you want the the file to be opened in the browser. If you want the file to be downloaded use .download()
     */
    sendFile(absolutePath: string, mimeType?: string): void {
        mimeType =
            mimeType || mime.lookup(absolutePath) || "application/octet-stream";
        const stat = fs.statSync(absolutePath);
        this.res.writeHead(200, {
            "Content-Type": mimeType,
            "Content-Length": stat.size,
        });
        const readStream: ReadStream = fs.createReadStream(absolutePath);
        readStream.pipe(this.res);
        this.sendingFile = true;
    }
    /**
     * @param {string} absolutePath - The absolute path to the file you want to send to the user
     * @param {string} [mimeType] - The mime-type, if no mime-type is specified an automatic mime-type will be used
     * @description - This method will prompt a user to download a file, the file will be downloaded if you want to open the file in the browser use .send()
     */
    download(absolutePath: string, mimeType?: string): void {
        mimeType =
            mimeType || mime.lookup(absolutePath) || "application/octet-stream";
        const stat = fs.statSync(absolutePath);
        this.res.writeHead(200, {
            "Content-Type": mimeType,
            "Content-Length": stat.size,
            "Content-Disposition": "attachment",
            filename: path.basename(absolutePath),
        });
        const readStream: ReadStream = fs.createReadStream(absolutePath);
        readStream.pipe(this.res);
        this.sendingFile = true;
    }

    /**
     * @returns {http.ServerResponse} Returns the original nodejs res object
     * @description - Use this file if you want access to the original nodejs if MyFramework doesn't support the specific feature you want
     */
    getNodeResponseObject(): http.ServerResponse {
        return this.res;
    }
    /**
     * @description - Will end the transmission to the client, only use this if you know what you are doing
     */
    end(): void {
        this.res.end();
    }
    /**
     * Will send a object as JSON to the client - no other data can be sent after this
     * @param data A object that will be converted to JSON and sent to the client with json content type
     */
    json(data: object): void {
        this.res.writeHead(200, {
            "Content-Type": "application/json",
        });
        this.send(JSON.stringify(data));
    }
    /**
     * Will render a view object and send the rendered content to the client data should already have been passed to the object
     * @param view An instance of the view object you want to render
     */
    render(view: View) {
        this.res.writeHead(200, { "Content-Type": "text/html" });
        this.send(view.render());
    }

    /**
     *
     * @param key The key for the cookie, will be used whenever you want to access your cookie -- NOTE: Formatting is important no spaces are allowed
     * @param value The value that will be kept for the cookie
     * @param options Different options how the cookie will be stored, currently only path is supported
     */
    setCookie(key: string, value: string, options?: CookieOptions) {
        // TODO: Remove whitespace from key
        let cookieData = key + "=" + value;
        if (options) {
            if (options.path) {
                cookieData += ";Path=" + options.path;
            }
        }
        this.res.setHeader("Set-Cookie", cookieData);
    }

    setStatusCode(code: number) {
        this.res.statusCode = code;
    }
}

export interface CookieOptions {
    maxAge?: number;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: SameSite;
}
enum SameSite {
    strict = "Strict",
    lax = "Lax",
    noen = "None",
}
