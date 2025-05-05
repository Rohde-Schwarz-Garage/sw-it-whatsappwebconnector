import { WhatsAppMessage } from "../model/message";

// Basic type declerations - do not touch
interface Listener {
    id: number;
    url: string;
    failedAttempts: number;
}

export interface WebhookEvent {
    type: string;
    data: any;
}


// webhook event types - add new events here, they need to implement the WebhookEvent interface
export class WebhookMessageEvent implements WebhookEvent {
    public type = "message";
    public data: WhatsAppMessage;


    constructor(data: WhatsAppMessage) {
        this.data = data;
    }
}

export class WebhookSelfMessageEvent implements WebhookEvent {
    public type = "selfMessage";
    public data: WhatsAppMessage;


    constructor(data: WhatsAppMessage) {
        this.data = data;
    }
}


// Event handling, do not touch
/**
 * EventManager is a class that manages listeners for webhook events.
 */
export class EventManager {
    private listeners: Listener[];
    private nextId: number;


    constructor() {
        this.listeners = [];
        this.nextId = 0;
    }


    /**
     * Checks if a listener with the specified URL exists in the list of listeners.
     *
     * @param url - The URL of the listener to check for.
     * @returns `true` if a listener with the specified URL exists, otherwise `false`.
     */
    public hasListener(url: string): boolean {
        let found = false;
        for (const listener of this.listeners) {
            if (listener.url === url) {
                found = true;
                break;
            }
        }

        return found;
    }

    /**
     * Adds a new listener with the specified URL to the list of listeners.
     * If a listener with the given URL already exists, the method returns -1.
     * Otherwise, it assigns a unique ID to the new listener and returns the ID.
     *
     * @param url - The URL of the listener to be added.
     * @returns The unique ID of the newly added listener, or -1 if the listener already exists.
     */
    public addListener(url: string): number {
        if (this.hasListener(url)) return -1;

        const id = this.nextId++;
        this.listeners.push({ id, url, failedAttempts: 0 });

        return id;
    }

    /**
     * Retrieves the list of registered listeners.
     *
     * @returns {Listener[]} An array of listeners currently registered.
     */
    public getListeners(): Listener[] {
        return this.listeners;
    }

    /**
     * Removes a listener from the list of listeners based on its unique identifier.
     *
     * @param id - The unique identifier of the listener to be removed.
     */
    public removeListener(id: number): void {
        this.listeners = this.listeners.filter((listener) => listener.id !== id);
    }

    /**
     * Filters out invalid listeners from the `listeners` array.
     * A listener is considered invalid if it has failed more than or equal to 3 times.
     * This method updates the `listeners` array to only include valid listeners.
     */
    private filterInvalidListeners() {
        this.listeners = this.listeners.filter(l => l.failedAttempts < 3);
    }

    /**
     * Notifies a listener by sending a POST request with the provided event data.
     *
     * @param listener - The listener object containing the URL to notify and tracking failed attempts.
     * @param evt - The webhook event data to be sent in the request body.
     * @param abortSignal - An AbortSignal to allow cancellation of the request.
     * @returns A promise that resolves when the notification attempt is complete.
     *
     * @remarks
     * - If the request is successful, the listener's `failedAttempts` counter is reset to 0.
     * - If an error occurs during the request, the error is logged, and the listener's `failedAttempts` counter is incremented.
     */
    private async notifyListener(listener: Listener, evt: WebhookEvent, abortSignal: AbortSignal): Promise<void> {
        const request = new Request(listener.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(evt),
        });

        try {
            await fetch(request, { signal: abortSignal });
            listener.failedAttempts = 0;
        } catch (error) {
            console.error(`Error notifying listener ${listener}:`, error);
            listener.failedAttempts++;
        }
    }

    /**
     * Dispatches a webhook event to all registered listeners.
     *
     * This method notifies all listeners of the provided event asynchronously.
     * Each listener is called with the event and an abort signal, allowing them
     * to handle the event or abort their operation if the signal is triggered.
     * 
     * A timeout of 5 seconds is applied to the dispatch operation. If the timeout
     * is reached, the abort signal is triggered, and any pending listener operations
     * are canceled.
     *
     * After dispatching the event, invalid listeners are filtered out.
     *
     * @param evt - The webhook event to be dispatched to the listeners.
     * @returns A promise that resolves when all listeners have been notified or aborted.
     */
    public async dispatchEvent(evt: WebhookEvent): Promise<void> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
            await Promise.all(
                this.listeners.map((listener) =>
                    this.notifyListener(listener, evt, controller.signal)
                )
            );
        } finally {
            clearTimeout(timeout);
        }

        this.filterInvalidListeners();
    }
}