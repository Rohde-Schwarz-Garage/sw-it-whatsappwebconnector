import { Client, LocalAuth, Message, MessageContent, MessageSendOptions } from "whatsapp-web.js";
import { config } from "../config/config";
import { parseWhatsAppMessage as convertWhatsAppMessage, WhatsAppMessage } from "../model/message";
import { MessagingCache } from "./messagingCache";
import { EventManager, WebhookMessageEvent } from "../repository/eventManager";
import MediaHandler from "../repository/mediaHandler";
import qrcode from "qrcode-terminal";


export class WhatsApp {
    private events: EventManager;
    private media: MediaHandler;

    private client: Client;
    private cache: MessagingCache;

    private _ready: boolean = false;


    constructor(events: EventManager, media: MediaHandler) {
        this.events = events;
        this.media = media;

        this.cache = new MessagingCache();
        this.client = new Client({
            authStrategy: new LocalAuth({ dataPath: config.whatsAppAuthFolder }),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
        });

        this.client.on("ready", this.handleReady.bind(this));
        this.client.on("message", this.handleMessage.bind(this));
        this.client.on("qr", (qr: any) => qrcode.generate(qr, { small: true }));
    }


    /**
     * Establishes a connection by initializing the WhatsApp client.
     * This method is asynchronous and triggers the client's initialization process.
     * Ensure that the client is properly configured before calling this method.
     *
     * @returns {Promise<void>} A promise that resolves when the client is successfully initialized.
     */
    public async connect() {
        this.client.initialize();
    }

    /**
     * Checks if the WhatsApp client is ready.
     *
     * @returns A boolean indicating whether the client is ready.
     */
    public isReady = () => this._ready;

    /**
     * Handles the event when the WhatsApp client is ready.
     * Logs a message indicating readiness and updates the internal `_ready` state.
     * 
     * @private
     * @async
     */
    private async handleReady() {
        console.log("The WhatsApp client is ready");
        this._ready = true;
    }

    /**
     * Handles an incoming WhatsApp message, processes it, and dispatches an event.
     * If the message contains media, it attempts to download and save the media,
     * updating the message object with media details.
     *
     * @param msgTemp - The incoming WhatsApp message to be processed.
     * @returns A promise that resolves when the message has been processed and the event dispatched.
     *
     * @throws Will log an error if downloading media fails, but the event will still be dispatched.
     */
    private async handleMessage(msgTemp: Message) {
        const msg = await convertWhatsAppMessage(msgTemp, this.cache);
        const event = new WebhookMessageEvent(msg);
        if (!msg.hasMedia) {
            this.events.dispatchEvent(event);
            return;
        }

        msg.media = {
            saved: false,
            fileLocation: "",
            mimeType: "",
        }

        try {
            const [fileName, mimeType] = await this.media.downloadMessageMedia(msgTemp);
            msg.media.mimeType = mimeType;
            msg.media.fileLocation = `/media/${fileName}`;
            msg.media.saved = true;
        } catch (error) {
            console.error(`Failed to download media for message ${msg.id}: `, error);
        } finally {
            this.events.dispatchEvent(event);
        }
    }

    /**
     * Sends a message to a specified chat.
     *
     * @param chatId - The unique identifier of the chat where the message will be sent.
     * @param content - The content of the message to be sent. This can include text, media, or other supported message types.
     * @param options - Additional options for sending the message, such as quoted messages, mentions, or other metadata.
     * @returns A promise that resolves to the sent WhatsApp message object.
     */
    public async sendMessage(chatId: string, content: MessageContent, options: MessageSendOptions): Promise<WhatsAppMessage> {
        const msg = await this.client.sendMessage(chatId, content, options);
        return await convertWhatsAppMessage(msg, this.cache);
    }

    /**
     * Retrieves a contact by their unique identifier.
     *
     * @param id - The unique identifier of the contact to retrieve.
     * @returns A promise that resolves to the contact object associated with the given ID.
     */
    public async getContactById(id: string) {
        return await this.client.getContactById(id);
    }
}