import { BINARY_ENCODING, IExecuteFunctions, INode, INodeExecutionData, NodeOperationError } from "n8n-workflow";
import { request } from "./webHooks";
import mimeTypes from './mimetypes.json';


const idRegex = /^[a-zA-Z0-9]+@[a-zA-Z0-9.]+$/;

/**
 * Validates the provided chat ID to ensure it meets the required format.
 *
 * @param node - The current node instance, used for error reporting.
 * @param chatId - The chat ID to validate. It must be a non-empty string
 *                 and follow the format `<id>@<server>` (e.g., `491242314@c.us`).
 *
 * @throws {NodeOperationError} If the chat ID is empty or does not match the required format.
 */
export function validateChatId(node: INode, chatId: string) {
	if (!chatId || chatId.length === 0) throw new NodeOperationError(node, 'Setting a chat id is required');
	if (!chatId.match(idRegex)) throw new NodeOperationError(node, 'A chat id must be in the format <id>@<server> - for example 491242314@c.us');
}

/**
 * Validates the provided contact ID to ensure it is not blank and follows the expected format.
 *
 * @param node - The node instance where the validation is being performed.
 * @param contactId - The contact ID to validate. It must be in the format `<id>@<server>`,
 *                    for example, `491242314@c.us`.
 * @throws {NodeOperationError} If the contact ID is blank or does not match the required format.
 */
export function validateContactId(node: INode, contactId: string) {
	if (!contactId || contactId.length === 0) throw new NodeOperationError(node, 'A contact id may not be blank');
	if (!contactId.match(idRegex)) throw new NodeOperationError(node, 'A contact id must be in the format <id>@<server> - for example 491242314@c.us');
}

/**
 * Validates the format of a given message ID. The message ID must match the
 * specified format `<id>@<server>` (e.g., `491242314@c.us`). If the message ID
 * is invalid, an error is thrown.
 *
 * @param node - The node instance where the validation is being performed.
 * @param messageId - The message ID to validate. If undefined or empty, the function returns without validation.
 * @throws {NodeOperationError} If the message ID does not match the required format.
 */
export function validateMessageId(node: INode, messageId: string | undefined) {
	if (!messageId || messageId.length === 0) return;
	if (!messageId.match(idRegex)) throw new NodeOperationError(node, 'A message id must be in the format <id>@<server> - for example 491242314@c.us')
}

/**
 * Parses the contact body for a messaging operation.
 *
 * This function retrieves the contact IDs from the node parameters, validates each contact ID,
 * and constructs a contact body object to be used in the messaging operation.
 *
 * @param this - Reference to the `IExecuteFunctions` instance, providing access to node parameters and utilities.
 * @param i - The index of the current execution item.
 * @returns An object containing the type of the message ('contact') and the validated contact IDs.
 * @throws {NodeOperationError} If no contact IDs are provided or if any contact ID is invalid.
 */
export function parseContactBody(this: IExecuteFunctions, i: number) {
	const contactIds = this.getNodeParameter('contactIds', i) as string[];
	if (contactIds.length === 0) throw new NodeOperationError(this.getNode(), 'At least one contact ID to send is required');

	contactIds.forEach((contactId) => validateContactId(this.getNode(), contactId));

	return {
		type: 'contact',
		contactIds: contactIds,
	}
}

/**
 * Parses the location data from the node parameters and constructs a location object.
 *
 * @param this - The execution context of the function, providing access to node parameters.
 * @param i - The index of the current execution item.
 * @returns An object containing location details including type, address, latitude, longitude, name, and URL.
 */
function parseLocationBody(this: IExecuteFunctions, i: number) {
	return {
		type: 'location',
		address: this.getNodeParameter('locationOptions.locationAddress', i) as string,
		latitude: this.getNodeParameter('latitude', i) as number,
		longitude: this.getNodeParameter('longitude', i) as number,
		name: this.getNodeParameter('locationOptions.locationName', i) as string,
		url: this.getNodeParameter('locationOptions.locationUrl', i) as string,
	}
}

/**
 * Parses and validates the media body from the input data, ensuring it meets the requirements
 * for uploading to the WhatsApp API. This function handles binary data, validates MIME types,
 * and uploads the media to the WhatsApp server.
 *
 * @param this - The execution context of the n8n workflow.
 * @param item - The current execution data item containing binary data.
 * @param i - The index of the current execution data item.
 * @returns A promise that resolves to an object containing media metadata and additional options.
 *
 * @throws {NodeOperationError} If no input data is found.
 * @throws {NodeOperationError} If the binary data does not contain a file name.
 * @throws {NodeOperationError} If the MIME type is not supported by WhatsApp.
 * @throws {NodeOperationError} If the MIME type does not match the selected media type.
 */
async function parseMediaBody(this: IExecuteFunctions, item: INodeExecutionData, i: number) {
	const items = this.getInputData();
	if (items.length === 0) throw new NodeOperationError(this.getNode(), 'No input data was found');

	const binaryMediaName = this.getNodeParameter('binaryMediaName', i) as string;
	const binaryData = item.binary![binaryMediaName];

	const fileName = binaryData.fileName?.toString();
	if (!fileName) throw new NodeOperationError(this.getNode(), `The binary data "${binaryMediaName}" does not contain a file name`);

	if (!mimeTypes.find(t => t === binaryData.mimeType)) throw new NodeOperationError(this.getNode(), `The mime type "${binaryData.mimeType}" is not supported by WhatsApp`);

	const mediaType = this.getNodeParameter('mediaType', i) as string;
	const mimeSplit = binaryData.mimeType.split('/')[0];
	if (
		mediaType === 'audio' && mimeSplit !== 'audio' ||
		mediaType === 'video' && mimeSplit !== 'video' ||
		mediaType === 'image' && mimeSplit !== 'image' ||
		mediaType === 'document' && mimeSplit !== 'application'
	) throw new NodeOperationError(this.getNode(), `The mime type "${binaryData.mimeType}" does not match the selected media type "${mediaType}"`);

	const uploadData = binaryData.id ? (await this.helpers.getBinaryStream(binaryData.id)) : Buffer.from(binaryData.data, BINARY_ENCODING);

	const credentials = await this.getCredentials('whatsAppWebApi');
	const response = await this.helpers.request({
		formData: {
			media: {
				value: uploadData,
				options: {
					filename: fileName,
					contentType: binaryData.mimeType,
				},
			}
		},
		headers: {
			'Content-Type': 'multipart/form-data',
			Authorization: `Bearer ${credentials.apiKey}`,
		},
		method: 'POST',
		url: `${credentials.apiUrl}/media/upload`,
		json: true,
	});

	return {
		type: 'media',
		mediaId: response.mediaId,
		sendAudioAsVoice: this.getNodeParameter('sendAudioAsVoice', i, false) as boolean,
		sendVideoAsGif: this.getNodeParameter('sendVideoAsGif', i, false) as boolean,
		sendMediaAsSticker: this.getNodeParameter('sendMediaAsSticker', i, false) as boolean,
		sendMediaAsDocument: this.getNodeParameter('sendMediaAsDocument', i, false) as boolean,
		isViewOnce: this.getNodeParameter('isViewOnce', i, false) as boolean,
		caption: this.getNodeParameter('caption', i, '') as string || undefined,
		stickerAuthor: this.getNodeParameter('stickerAuthor', i, '') as string || undefined,
		stickerName: this.getNodeParameter('stickerName', i, '') as string || undefined,
		stickerCategories: this.getNodeParameter('stickerCategories', i, []) as string[] || undefined,
	};
}

/**
 * Parses the poll body parameters and validates the input.
 *
 * @param this - The execution context of the node.
 * @param i - The index of the current item being processed.
 * @returns An object representing the poll with its name, options, and configuration.
 * @throws {NodeOperationError} If the poll name is missing or empty.
 * @throws {NodeOperationError} If fewer than two poll options are provided.
 * @throws {NodeOperationError} If any poll option is blank.
 */
function parsePollBody(this: IExecuteFunctions, i: number) {
	const pollName = this.getNodeParameter('pollName', i) as string;
	if (!pollName || pollName.length === 0) throw new NodeOperationError(this.getNode(), 'A poll name is required');

	const pollOptions = this.getNodeParameter('pollOptions', i) as string[];
	if (pollOptions.length <= 1) throw new NodeOperationError(this.getNode(), 'At least two poll options are required');
	pollOptions.forEach((option) => { if (!option || option.length === 0) throw new NodeOperationError(this.getNode(), 'A poll option may not be blank') });

	return {
		type: 'poll',
		name: pollName,
		options: pollOptions,
		allowMultipleAnswers: this.getNodeParameter('allowMultipleAnswers', i) as boolean,
	}
}

/**
 * Parses the text body for a WhatsApp message.
 *
 * @param this - The execution context of the node.
 * @param i - The index of the item being processed.
 * @returns An object representing the text message with its type and content.
 * @throws {NodeOperationError} If the text message is empty or not provided.
 */
function parseTextBody(this: IExecuteFunctions, i: number) {
	const text = this.getNodeParameter('text', i) as string;
	if (!text || text.length === 0) throw new NodeOperationError(this.getNode(), 'A text message is required');

	return {
		type: 'text',
		text: text,
	}
}

/**
 * Parses the message body based on the specified content type.
 *
 * @param this - The execution context of the node.
 * @param item - The execution data for the current item.
 * @param i - The index of the current item being processed.
 * @returns A promise resolving to the parsed message body.
 * @throws {NodeOperationError} If the content type is unknown.
 */
export async function parseMessageBody(this: IExecuteFunctions, item: INodeExecutionData, i: number) {
	const contentType = this.getNodeParameter('contentType', i) as string;
	switch (contentType) {
		case 'contact': return parseContactBody.call(this, i);
		case 'location': return parseLocationBody.call(this, i);
		case 'media': return await parseMediaBody.call(this, item, i);
		case 'poll': return parsePollBody.call(this, i);
		case 'text': return parseTextBody.call(this, i);
	}

	throw new NodeOperationError(this.getNode(), `Unknown content type "${contentType}"`);
}

/**
 * Sends a message using the WhatsApp Web API.
 *
 * @param this - Reference to the `IExecuteFunctions` context, providing access to utility functions.
 * @param message - The message payload to be sent. This should include all necessary fields required by the API.
 * @returns A promise resolving to the API response.
 */
export async function sendMessage(this: IExecuteFunctions, message: any) {
	return request.call(this, 'POST', '/message', message);
}
