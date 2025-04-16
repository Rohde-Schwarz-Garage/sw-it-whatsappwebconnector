import { IExecuteFunctions, IHookFunctions, IHttpRequestMethods, IRequestOptions, JsonObject, NodeApiError } from "n8n-workflow";

/**
 * Sends an HTTP request to the specified endpoint using the provided method and body.
 *
 * @param this - The context of the function, which can be either `IHookFunctions` or `IExecuteFunctions`.
 * @param method - The HTTP method to use for the request (e.g., GET, POST, PUT, DELETE).
 * @param endpoint - The API endpoint to send the request to.
 * @param body - (Optional) The JSON object to include in the request body.
 * @returns A promise that resolves with the response from the API.
 * @throws {NodeApiError} Throws an error if the API request fails.
 */
export async function request(this: IHookFunctions | IExecuteFunctions, method: IHttpRequestMethods, endpoint: string, body?: JsonObject) {
	const credentials = await this.getCredentials("whatsAppWebApi");

	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${credentials.apiKey}`,
		},
		method: method,
		body: body,
		json: true,
		uri: `${credentials.apiUrl}${endpoint}`,
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Retrieves the list of webhooks configured for the WhatsApp Web API.
 *
 * @param this - The context of the hook functions, providing access to the request utility.
 * @returns A promise resolving to the response of the GET request to the `/webhook` endpoint.
 */
export async function getWebhooks(this: IHookFunctions) {
	return request.call(this, 'GET', '/webhook');
}

/**
 * Subscribes to a webhook by sending a POST request to the specified endpoint.
 *
 * @param this - The context of the hook functions, providing access to necessary utilities.
 * @param webhookUrl - The URL of the webhook to subscribe to.
 * @returns A promise resolving to the response of the subscription request.
 */
export async function subscribeWebhook(this: IHookFunctions, webhookUrl: string) {
	return request.call(this, 'POST', '/webhook/subscribe', { url: webhookUrl });
}

/**
 * Deletes a webhook by its ID.
 *
 * @param this - The context of the hook functions.
 * @param webhookId - The unique identifier of the webhook to be deleted.
 * @returns A promise resolving to the response of the DELETE request.
 */
export async function deleteWebhook(this: IHookFunctions, webhookId: string) {
	return request.call(this, 'DELETE', `/webhook/${webhookId}`);
}
