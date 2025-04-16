// Sending Buttons and Lists is not possible
import { Contact, Location, MessageContent, MessageMedia, MessageSendOptions, Poll } from "whatsapp-web.js";
import { z } from "zod";
import { WhatsApp } from "../whatsapp/whatsApp";
import MediaHandler from "../repository/mediaHandler";


// Define the validation schemas for the message body types with Zod. Zod is a library that allows you to define and validate data schemas.
const MessageBodyText = z.object({
    type: z.literal("text"),
    text: z.string(),
})
type MessageBodyText = z.infer<typeof MessageBodyText>;

const MessageBodyLocation = z.object({
    type: z.literal("location"),
    address: z.string().optional(),
    latitude: z.number(),
    longitude: z.number(),
    name: z.string().optional(),
    url: z.string().optional(),
});
type MessageBodyLocation = z.infer<typeof MessageBodyLocation>;

const MessageBodyPoll = z.object({
    type: z.literal("poll"),
    name: z.string(),
    options: z.array(z.string()),
    allowMultipleAnswers: z.boolean(),
});
type MessageBodyPoll = z.infer<typeof MessageBodyPoll>;

const MessageBodyContact = z.object({
    type: z.literal("contact"),
    contactIds: z.array(z.string()),
});
type MessageBodyContact = z.infer<typeof MessageBodyContact>;

const MessageBodyMedia = z.object({
    type: z.literal("media"),
    mediaId: z.string(),
    sendAudioAsVoice: z.boolean().optional(),
    sendVideoAsGif: z.boolean().optional(),
    sendMediaAsSticker: z.boolean().optional(),
    sendMediaAsDocument: z.boolean().optional(),
    isViewOnce: z.boolean().optional(),
    caption: z.string().optional(),
    stickerAuthor: z.string().optional(),
    stickerName: z.string().optional(),
    stickerCategories: z.array(z.string()).optional(),
});
type MessageBodyMedia = z.infer<typeof MessageBodyMedia>;

const SendMessageBody = z.union([MessageBodyText, MessageBodyLocation, MessageBodyPoll, MessageBodyContact, MessageBodyMedia]);
type SendMessageBody = z.infer<typeof SendMessageBody>;

const SendMessageRequestOptions = z.object({
    linkPreview: z.boolean().optional(),
    parseVCards: z.boolean().optional(),
    quotedMessageId: z.string().optional(),
    sendSeen: z.boolean().optional(), 
});
type SendMessageRequestOptions = z.infer<typeof SendMessageRequestOptions>;

const SendMessageRequest = z.object({
    chatId: z.string(),
    message: SendMessageBody,
    options: SendMessageRequestOptions.optional(),
});
type SendMessageRequest = z.infer<typeof SendMessageRequest>;

export interface SendMessageData {
    chatId: string;
    message: MessageContent;
    options: MessageSendOptions;
}


// Convert the request models to the WhatsApp message models

/**
 * Takes an http request body and parses it into a SendMessageData object.
 * @param body the body of the http request made to the server
 * @param wa the instance of the custom wweb.js client wrapper
 * @param media a media handler instance to handle incoming media files
 * @returns a parsed SendMessageData object
 */
export async function parseSendMessageRequest(body: any, wa: WhatsApp, media: MediaHandler): Promise<SendMessageData> {
    const req = SendMessageRequest.parse(body);
    const options = parseMessageSendOptions(req.options);

    return {
        chatId: req.chatId,
        message: await parseMessageBody(req.message, wa, media, options),
        options: options,
    }
}

/**
 * Parses options from the request body into a MessageSendOptions object.
 * @param options the options object from the request body
 * @returns a parsed MessageSendOptions object
 */
function parseMessageSendOptions(options?: SendMessageRequestOptions): MessageSendOptions {
    if (!options) return { };

    return {
        linkPreview: options.linkPreview,
        parseVCards: options.parseVCards,
        quotedMessageId: options.quotedMessageId,
        sendSeen: options.sendSeen,
    }
}

/**
 * Parses the body of the message based on the type of message.
 * @param req the request body containing the message
 * @param wa the instance of the custom wweb.js client wrapper
 * @param media a media handler instance to handle incoming media files
 * @param options the message sending options that have been previously parsed
 * @returns the correct implementation of MessageContant based on the type of message
 */
export async function parseMessageBody(req: SendMessageBody, wa: WhatsApp, media: MediaHandler, options: MessageSendOptions): Promise<MessageContent> {
    if (!req?.type) throw new Error("No message body type provided!");

    switch (req.type) {
        case "text": 
            return parseTextBody(MessageBodyText.parse(req));
        case "location":
            return parseLocationBody(MessageBodyLocation.parse(req));
        case "poll":
            return parsePollBody(MessageBodyPoll.parse(req));
        case "contact":
            return await parseContactsBody(MessageBodyContact.parse(req), wa);
        case "media":
            return await parseMediaBody(MessageBodyMedia.parse(req), media, options);
    }
}

/**
 * Parses the text body of a message and extracts its content.
 *
 * @param body - The message body containing the text to be parsed.
 * @returns The extracted text content of the message.
 */
function parseTextBody(body: MessageBodyText): MessageContent {
    return body.text;
}

/**
 * Parses a location message body and converts it into a `Location` object.
 *
 * @param body - The location message body containing latitude, longitude, and optional metadata.
 * @returns A `Location` object representing the parsed location data.
 */
function parseLocationBody(body: MessageBodyLocation): MessageContent {
    return new Location(body.latitude, body.longitude, {
        address: body.address,
        name: body.name,
        url: body.url,
    });
}

/**
 * Parses the provided poll message body and constructs a `Poll` object.
 *
 * @param body - The poll message body containing the poll details.
 * @returns A `MessageContent` object representing the parsed poll.
 */
function parsePollBody(body: MessageBodyPoll): MessageContent {
    return new Poll(body.name, body.options, {
        allowMultipleAnswers: body.allowMultipleAnswers,
        messageSecret: undefined,
    });
}

/**
 * Parses the body of a message containing contact IDs and retrieves the corresponding contact(s).
 *
 * @param body - The message body containing an array of contact IDs.
 * @param wa - An instance of the WhatsApp client used to fetch contact details.
 * @returns A promise that resolves to a single contact if only one ID is provided,
 *          or an array of contacts if multiple IDs are provided.
 */
async function parseContactsBody(body: MessageBodyContact, wa: WhatsApp): Promise<MessageContent> {
    const contacts: Contact[] = [];
    for (const id of body.contactIds) {
        contacts.push(await wa.getContactById(id));
    }

    return contacts.length === 1 ? contacts[0] : contacts;
}

/**
 * Parses the media body and prepares the media content for sending.
 *
 * @param body - The media message body containing details about the media.
 * @param handler - The media handler responsible for managing media files.
 * @param options - The options for sending the message, which will be updated based on the media body.
 * @returns A promise that resolves to the prepared media content.
 * @throws An error if the media file corresponding to the provided media ID is not found.
 */
async function parseMediaBody(body: MessageBodyMedia, handler: MediaHandler, options: MessageSendOptions): Promise<MessageContent> {
    const file = handler.getFilePath(body.mediaId);
    if (!file) throw new Error(`Media file '${body.mediaId}' not found!`);

    const media = MessageMedia.fromFilePath(file);
    handler.deleteFile(body.mediaId); 

    options.sendAudioAsVoice = body.sendAudioAsVoice;
    options.sendVideoAsGif = body.sendVideoAsGif;
    options.sendMediaAsSticker = body.sendMediaAsSticker;
    options.sendMediaAsDocument = body.sendMediaAsDocument;
    options.isViewOnce = body.isViewOnce;
    options.caption = body.caption;
    options.stickerAuthor = body.stickerAuthor;
    options.stickerName = body.stickerName;
    options.stickerCategories = body.stickerCategories;

    return media;
}