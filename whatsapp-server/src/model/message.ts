import { Message } from "whatsapp-web.js";
import { MessagingCache } from "../whatsapp/messagingCache";

// Define the structure of the WhatsApp message object that gets sent to all subscribed webhooks
export interface Contact {
    id: string;

    isBlocked: boolean;
    isBusiness: boolean;
    isEnterprise: boolean;
    isGroup: boolean;
    isMe: boolean;
    isMyContact: boolean;
    isUser: boolean;
    isWAContact: boolean;

    name: string | null;
    number: string;
    pushname: string;
    shortName: string | null;

    about: string | null;
}

export interface Chat {
    id: string;
    name: string | null;
    isArchived: boolean;
    isGroup: boolean;
    isMuted: boolean;
    isPinned: boolean;
    isReadOnly: boolean;
    lastActivity: number;
    muteExpiration: number;
    unreadCount: number;
}

export interface Media {
    saved: boolean;
    fileLocation: string;
    mimeType: string;
}

export interface WhatsAppMessage {
    id: string;
    body: string;
    timestamp: number;
    from: string;
    to: string;
    author: string | null;
    type: string;
    hasMedia: boolean;
    ack: number | null;
    deviceType: string | null;
    isForwarded: boolean;
    isStatus: boolean;
    mentionedIds: string[];
    hasQuotedMsg: boolean;
    quotedMsgId: string | null;
  
    media: Media | null;
  
    chat: Chat;
    contact: Contact;
}

/**
 * Converts a WhatsApp Web message object to a custom WhatsApp message object 
 * @param msg The message object received from WhatsAppWeb.js
 * @returns The custom message object
 */
export async function parseWhatsAppMessage(msg: Message, repo: MessagingCache): Promise<WhatsAppMessage> {
    // Get the contact object from the cache if it is cached
    let contact = repo.getContact(msg.author || msg.from);
    if (!contact) {
        // The contact object is not cached, so we need to get it from the message
        const msgContact = await msg.getContact();
        contact = {
            id: msgContact.id._serialized, // The id is equal to the user phone numbera
    
            isBlocked: msgContact.isBlocked,
            isBusiness: msgContact.isBusiness,
            isEnterprise: msgContact.isEnterprise,
            isGroup: msgContact.isGroup,
            isMe: msgContact.isMe,
            isMyContact: msgContact.isMyContact,
            isUser: msgContact.isUser,
            isWAContact: msgContact.isWAContact,
    
            name: msgContact.name || null,
            number: msgContact.number,
            pushname: msgContact.pushname,
            shortName: msgContact.shortName || null,
            about: (await msgContact.getAbout()),
        }

        repo.saveContact(contact);
    }
    
    // Get the chat object from the cache if it is cached
    let chat = repo.getChat(msg.fromMe ? msg.to : msg.from);
    if (!chat) {
        // The chat object is not cached, so we need to get it from the message
        const msgChat = await msg.getChat();
        chat = {
            id: msgChat.id._serialized, // The id of the chat - if its with a user it will be the phone number or else a unique chat id
    
            isArchived: msgChat.archived,
            isGroup: msgChat.isGroup,
            isMuted: msgChat.isMuted,
            isPinned: msgChat.pinned,
            isReadOnly: msgChat.isReadOnly,
    
            lastActivity: msgChat.timestamp,
            muteExpiration: msgChat.muteExpiration,
            name: msgChat.name,
            unreadCount: msgChat.unreadCount,
        }
    }

    // Create the media object if the message contains media although it is not saved yet 
    // - This is because the rule should be that if hasMedia is set to true, the media field should be present
    const media: Media | null = msg.hasMedia ? {
        saved: false,
        fileLocation: "",
        mimeType: "undefined",
    } : null;

    const message: WhatsAppMessage = {
        id: msg.id._serialized, // The id of the message is generated for each message
        timestamp: msg.timestamp,
        ack: msg.ack ?? null,

        from: msg.from,
        to: msg.to,
        author: msg.author || null,

        type: msg.type,
        hasMedia: msg.hasMedia,
        body: msg.body,

        deviceType: msg.deviceType || null,
        isForwarded: msg.isForwarded,
        isStatus: msg.isStatus,

        mentionedIds: msg.mentionedIds || [],
        hasQuotedMsg: msg.hasQuotedMsg,
        quotedMsgId: (await msg.getQuotedMessage())?.id?._serialized || null, // getQuotedMessage returns undefined if hasQuotedMsg is false

        media: media, 
        chat: chat,
        contact: contact,
    }

    return message;
}