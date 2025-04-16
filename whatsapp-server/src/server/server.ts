import express, { Express, Request, Response } from 'express';
import serveStatic from 'serve-static';
import { config } from '../config/config';
import { WhatsApp } from '../whatsapp/whatsApp';
import { parseSendMessageRequest, SendMessageData } from '../model/request';
import { EventManager } from '../repository/eventManager';
import { WhatsAppMessage } from '../model/message';
import fileUpload, { UploadedFile } from 'express-fileupload';
import MediaHandler from '../repository/mediaHandler';

/**
 * The server is used to expose an api to external services.
 * It allows subscribing to events via webhooks and triggering
 * WhatsApp events.
 */
export class Server {
    private app: Express;
    private events: EventManager;
    private wa: WhatsApp;
    private media: MediaHandler;
    
    
    constructor(events: EventManager, wa: WhatsApp, media: MediaHandler) { 
        this.events = events;
        this.wa = wa;
        this.media = media;

        this.app = express();
        this.setupRoutes();
    }


    /**
     * Starts the server and listens on the specified port.
     */
    public start(): void {
        this.app.listen(config.serverPort, () => {
            console.log(`API server is running on port ${config.serverPort}`);
        });
    }

    /**
     * Sets up the routes and middleware for the Express application.
     * Note: Routes marked as "do not touch" are critical for integration and should not be modified.
     */
    private setupRoutes() {
        // Middleware setup - do not touch
        this.app.use(express.json()); // parse JSON request bodies
        this.app.use(fileUpload()); // parse multipart/form-data request bodies
        this.app.use('/media', serveStatic(this.media.getIncomingMediaDirectory(), { index: false })) // serve the downloaded media files

        // WhatsApp request handlers - add new features here
        this.app.post('/message', this.sendMessage.bind(this));

        // Base route handlers required for n8n integration - do not touch
        this.app.get('/health', this.getHealth.bind(this));
        this.app.post('/webhook/subscribe', this.registerWebhook.bind(this));
        this.app.get('/webhook', this.getWebhooks.bind(this));
        this.app.delete('/webhook/:id', this.deleteWebhook.bind(this));
        this.app.post('/media/upload', this.uploadMedia.bind(this));
    }



    /**
     * Handles the sending of a WhatsApp message.
     * 
     * This method processes an incoming HTTP request to send a message via WhatsApp.
     * It ensures the WhatsApp client is ready, parses the request body, and sends the message.
     * Appropriate HTTP responses are returned based on the success or failure of the operation.
     * 
     * @param req - The HTTP request object containing the message details in the body.
     * @param res - The HTTP response object used to send the response back to the client.
     * 
     * @throws {503 Service Unavailable} If the WhatsApp client is not ready.
     * @throws {400 Bad Request} If the request body cannot be parsed.
     * @throws {404 Not Found} If the chat ID is invalid or the chat cannot be found.
     * @throws {500 Internal Server Error} If the message fails to send due to an unexpected error.
     * 
     * @returns {void} Sends an HTTP response with the status and result of the operation.
     */
    public async sendMessage(req: Request, res: Response) {
        if (!this.wa.isReady()) { // ToDo: Instead of throwing an error, messages could be queued and sent once WhatsApp is ready
            res.status(503).json({ error: 'WhatsApp client is not ready yet' });
            return;
        }

        let data: SendMessageData;
        try {
            data = await parseSendMessageRequest(req.body, this.wa, this.media);
        } catch (error) {
            const message = (error as Error).message;
            console.error('Failed to parse request: ', message);
            res.status(400).json({ error: `Could not parse send message request: ${message}` });
            return;
        }

        let msg: WhatsAppMessage;
        try {
            msg = await this.wa.sendMessage(data.chatId, data.message, data.options);
        } catch (error) {
            const msg = (error as Error).message;
            if (msg.includes('wid error')) {
                res.status(404).json({ error: 'The chat could not be found - The chat id should end in @c.us' });
                return;
            }

            console.error('Failed to send message: ', (error as Error).message);
            res.status(500).json({ error: 'Failed to send message' });
            return;
        }

        res.status(201).json(msg);
    }

    // Base route handlers required for n8n integration - do not touch
    /**
     * Handles the health check endpoint.
     * 
     * @param _ - The incoming HTTP request object (not used in this method).
     * @param res - The HTTP response object used to send the health status.
     * 
     * @remarks
     * This method returns a JSON response indicating the health status of the server
     * and the readiness state of the WhatsApp service.
     * 
     * @returns A JSON object with the following structure:
     * - `satus`: A string indicating the server's health status (always 'healthy').
     * - `whatsapp`: A string indicating the readiness of the WhatsApp service ('ready' or 'loading').
     */
    public getHealth(_: Request, res: Response) {
        res.json({ satus: 'healthy', whatsapp: this.wa.isReady() ? 'ready' : 'loading' });
    }

    /**
     * Registers a webhook by adding a listener for the provided URL.
     * 
     * @param req - The HTTP request object, expected to contain a `url` field in the body.
     * @param res - The HTTP response object used to send the response.
     * 
     * @remarks
     * - If the `url` field is missing in the request body, a 400 status code is returned with an error message.
     * - If a listener for the provided URL already exists, a 409 status code is returned with an error message.
     * - If the webhook is successfully registered, a 201 status code is returned along with the generated listener ID.
     * 
     * @throws Will return an appropriate HTTP status code and error message if the request is invalid or conflicts with an existing listener.
     */
    public registerWebhook(req: Request, res: Response) {
        const url = req.body.url;
        if (!url) {
            res.status(400).json({ error: "The request is missing the mandatory 'url' field" });
            return;
        }

        if (this.events.hasListener(url)) {
            res.status(409).json({ error: 'A listener for this url has already been registered' });
            return;
        }

        const id = this.events.addListener(url);
        res.status(201).json({ id: id });
    }

    /**
     * Handles the retrieval of registered webhook listeners.
     *
     * @param _ - The HTTP request object (unused in this method).
     * @param res - The HTTP response object used to send the list of webhook listeners.
     *
     * @remarks
     * This method retrieves the currently registered webhook listeners from the event manager
     * and sends them as a JSON response.
     */
    public getWebhooks(_: Request, res: Response) {
        const listeners = this.events.getListeners();
        res.json(listeners);
    }

    /**
     * Deletes a webhook by its ID.
     * 
     * This method removes a webhook listener identified by the `id` parameter
     * from the event system and sends an appropriate HTTP response.
     * 
     * @param req - The HTTP request object, which must include the `id` parameter in the route.
     * @param res - The HTTP response object used to send the result of the operation.
     * 
     * @remarks
     * - If the `id` parameter is not a valid number, a 400 Bad Request response is returned with an error message.
     * - If the `id` is valid, the corresponding listener is removed, and a 200 OK response is sent with a success message.
     */
    public deleteWebhook(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid id' });
            return;
        }

        this.events.removeListener(id);
        res.status(200).send({ success: true });
    }

    /**
     * Handles the upload of a media file from the client.
     * 
     * This method processes the incoming request to upload a media file. It validates
     * the presence of the file, saves it using the media service, and returns a response
     * with the file's unique identifier. If an error occurs during the upload process,
     * appropriate error responses are sent back to the client.
     * 
     * @param req - The HTTP request object containing the media file in `req.files.media`.
     * @param res - The HTTP response object used to send the response back to the client.
     * 
     * @throws Will send a 400 status code if no media file is provided or if the file has
     *         an unsupported MIME type.
     * @throws Will send a 500 status code if an unexpected error occurs while saving the file.
     * 
     * @returns A JSON response with a 201 status code and the unique media ID if the upload
     *          is successful.
     */
    public async uploadMedia(req: Request, res: Response) {
        if (!req.files || !req.files.media) {
            res.status(400).json({ error: 'No media file provided' });
            return;
        }

        const mediaFile = req.files.media as UploadedFile;
        let fileId: string;
        try {
            fileId = this.media.saveUploadedMedia(mediaFile);
        } catch (error) {
            const message = (error as Error).message;
            if (message.includes('Unsupported MIME type')) {
                res.status(400).json({ error: message });
                return;
            }

            console.error('Failed to handle file upload:', (error as Error).message);
            res.status(500).json({ error: 'Failed to save file' });
            return;
        }

        res.status(201).json({ mediaId: fileId });
    }
}