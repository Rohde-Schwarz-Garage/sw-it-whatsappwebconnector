import { Chat, Contact } from "../model/message";
import NodeCache from "node-cache";

/**
 * This cache is for temporarily caching contacts and chats so that we don't have to 
 * fetch them from the WhatsApp client every time.
 */
export class MessagingCache {
    private contacts: NodeCache;
    private chats: NodeCache;


    constructor() {
        this.contacts = new NodeCache({ stdTTL: 120, checkperiod: 120 });
        this.chats = new NodeCache({ stdTTL: 120, checkperiod: 120 });
    }


    /**
     * Retrieves a contact from the messaging cache by its unique identifier.
     *
     * @param id - The unique identifier of the contact to retrieve.
     * @returns The `Contact` object if found, or `undefined` if no contact exists with the given ID.
     */
    public getContact(id: string): Contact | undefined {
        return this.contacts.get<Contact>(id);
    }

    /**
     * Saves a contact to the messaging cache.
     *
     * @param contact - The contact object to be saved. The contact is identified by its unique ID.
     */
    public saveContact(contact: Contact) {
        this.contacts.set(contact.id, contact);
    }

    /**
     * Retrieves a chat instance by its unique identifier.
     *
     * @param id - The unique identifier of the chat to retrieve.
     * @returns The chat instance if found, or `undefined` if no chat exists with the given ID.
     */
    public getChat(id: string): Chat | undefined {
        return this.chats.get<Chat>(id);
    }

    /**
     * Saves a chat instance to the messaging cache.
     *
     * @param chat - The chat object to be saved. It contains the chat's unique identifier and other relevant details.
     */
    public saveChat(chat: Chat) {
        this.chats.set(chat.id, chat);
    }
}