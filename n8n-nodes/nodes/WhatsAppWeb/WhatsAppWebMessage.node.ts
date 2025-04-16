import { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, NodeConnectionType } from "n8n-workflow";
import { parseMessageBody, sendMessage, validateChatId, validateMessageId } from "./api/messaging";

export class WhatsAppWebMessage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Send WhatsApp Web Messsage',
		name: 'whatsAppWebMessage',
		icon: { light: 'file:whatsappweb_light.svg', dark: 'file:whatsappweb_dark.svg' },
		group: ['output'],
		version: 1,
		description: 'Send a message via WhatsApp Web',
		defaults: {
			name: 'Send WhatsApp Web Messsage',
		},
		/* eslint-disable n8n-nodes-base/node-class-description-inputs-wrong-regular-node */
		inputs: [NodeConnectionType.Main],
		/* eslint-disable n8n-nodes-base/node-class-description-outputs-wrong */
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'whatsAppWebApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Chat ID',
				name: 'chatId',
				type: 'string',
				default: '',
				description: 'The ID of the chat to send the message to',
				required: true,
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Contacts',
						value: 'contact',
					}, {
						name: 'Location',
						value: 'location',
					}, {
						name: 'Media',
						value: 'media',
					},{
						name: 'Poll',
						value: 'poll',
					}, {
						name: 'Text',
						value: 'text',
					},
				],
				default: 'text',
				description: 'The type of content to send in the message',
				required: true,
			},

			// Contact content options
			{
				displayName: 'Contact IDs',
				name: 'contactIds',
				type: 'string',
				default: [''],
				description: 'The ID of the contact to send in the message',
				required: true,
				displayOptions: {
					show: {
						contentType: [
							'contact',
						],
					},
				},
				typeOptions: {
					multipleValueButtonText: 'Add another contact',
					multipleValues: true,
				}
			},

			// Location content options
			{
				displayName: 'Latitude',
				name: 'latitude',
				type: 'number',
				default: '',
				description: 'The latitude of the location to send in the message, formatted like: 11.134213125',
				required: true,
				displayOptions: {
					show: {
						contentType: [
							'location',
						],
					},
				},
			},
			{
				displayName: 'Longitude',
				name: 'longitude',
				type: 'number',
				default: '',
				description: 'The longitude of the location to send in the message, formatted like: 11.134213125',
				required: true,
				displayOptions: {
					show: {
						contentType: [
							'location',
						],
					},
				},
			},
			{
				displayName: 'Additional Location Options',
				name: 'locationOptions',
				type: 'collection',
				default: {},
				description: 'Additional options for the location message',
				placeholder: 'Add Location Options',
				displayOptions: {
					show: {
						contentType: [
							'location',
						],
					},
				},
				options: [
					{
						displayName: 'Location Name',
						name: 'locationName',
						type: 'string',
						default: '',
						description: 'The name of the location to send in the message',
					}, {
						displayName: 'Location Address',
						name: 'locationAddress',
						type: 'string',
						default: '',
						description: 'The address of the location to send in the message',
					}, {
						displayName: 'Location URL',
						name: 'locationUrl',
						type: 'string',
						default: '',
						description: 'The URL of the location to send in the message',
					}
				]
			},

			// Media content options
			{
				displayName: 'Input Binary Field',
				name: 'binaryMediaName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'The name of the binary property that contains the media to be sent',
				hint: 'The name of the binary property that contains the media to be sent',
				displayOptions: {
					show: {
						contentType: [
							'media',
						],
					},
				}
			},
			{
				displayName: 'Media Type',
				name: 'mediaType',
				type: 'options',
				default: 'any',
				description: 'The type of media to send in the message',
				required: true,
				options: [
					{
						name: 'Any',
						value: 'any',
						description: 'When selecting the any type, some type specific options may not be available',
					}, {
						name: 'Audio',
						value: 'audio',
					}, {
						name: 'Document',
						value: 'document',
					}, {
						name: 'Image',
						value: 'image',
					}, {
						name: 'Video',
						value: 'video',
					},
				],
				displayOptions: {
					show: {
						contentType: [
							'media',
						],
					},
				}
			},
			{
				displayName: 'Caption',
				name: 'caption',
				type: 'string',
				default: '',
				description: 'The caption of the media to send in the message',
				displayOptions: {
					show: {
						contentType: [
							'media',
						],
						mediaType: [
							'document',
							'image',
							'video',
						],
					},
				},
			},
			{
				displayName: 'WARNING: Selecting more than one option at once may cause unknown issues',
				name: 'warning',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						contentType: [
							'media',
						],
						mediaType: [
							'image',
							'video',
						],
					},
				}
			},
			{
				displayName: 'Send Audio As Voice',
				name: 'sendAudioAsVoice',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						contentType: [
							'media',
						],
						mediaType: [
							'audio',
						],
					},
				},
			},
			{
				displayName: 'Send Image As Sticker',
				name: 'sendMediaAsSticker',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						contentType: [
							'media',
						],
						mediaType: [
							'image',
						],
					},
				},
			},
			{
				displayName: 'Send Image As Document',
				name: 'sendMediaAsDocument',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						contentType: [
							'media',
						],
						mediaType: [
							'image',
						],
					},
				},
			},
			{
				displayName: 'Send Media As View Once',
				name: 'sendMediaAsViewOnce',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						mediaType: [
							'image',
							'video',
						],
					},
				},
			},
			{
				displayName: 'Send Video As GIF',
				name: 'sendVideoAsGif',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						mediaType: [
							'video',
						],
					},
				},
			},
			{
				displayName: 'Sticker Name',
				name: 'stickerName',
				type: 'string',
				default: '',
				description: 'The name of the sticker when sending an image as a sticker',
				displayOptions: {
					show: {
						contentType: [
							'media',
						],
						mediaType: [
							'image',
						],
						sendMediaAsSticker: [
							true,
						]
					},
				},
			},
			{
				displayName: 'Sticker Author',
				name: 'stickerAuthor',
				type: 'string',
				default: '',
				description: 'The author of the sticker when sending an image as a sticker',
				displayOptions: {
					show: {
						contentType: [
							'media',
						],
						mediaType: [
							'image',
						],
						sendMediaAsSticker: [
							true,
						]
					},
				},
			},
			{
				displayName: 'Sticker Categories',
				name: 'stickerCategories',
				type: 'string',
				default: [],
				description: 'The categories of the sticker when sending an image as a sticker',
				typeOptions: {
					multipleValueButtonText: 'Add another category',
					multipleValues: true,
				},
				displayOptions: {
					show: {
						contentType: [
							'media',
						],
						mediaType: [
							'image',
						],
						sendMediaAsSticker: [
							true,
						]
					},
				},
			},

			// Poll content options
			{
				displayName: 'Poll Name',
				name: 'pollName',
				type: 'string',
				default: '',
				description: 'The name of the poll to send in the message',
				required: true,
				displayOptions: {
					show: {
						contentType: [
							'poll',
						],
					},
				},
			},
			{
				displayName: 'Poll Options',
				name: 'pollOptions',
				type: 'string',
				default: [''],
				description: 'The options for the poll to send in the message',
				required: true,
				displayOptions: {
					show: {
						contentType: [
							'poll',
						],
					},
				},
				typeOptions: {
					multipleValueButtonText: 'Add another option',
					multipleValues: true,
				}
			},
			{
				displayName: 'Allow Multiple Answers',
				name: 'allowMultipleAnswers',
				type: 'boolean',
				default: false,
				description: 'Whether to allow a user to select multiple answers in the poll',
				displayOptions: {
					show: {
						contentType: [
							'poll',
						],
					},
				},
			},

			// Text content options
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				description: 'The text content of the message',
				required: true,
				displayOptions: {
					show: {
						contentType: [
							'text',
						],
					},
				},
				typeOptions: {
					rows: 5,
				}
			},

			// Other options
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				default: {},
				description: 'Additional options for the message',
				placeholder: 'Add Additional Options',
				options: [
					{
						displayName: 'Preview Links',
						name: 'previewLinks',
						type: 'boolean',
						default: true,
						description: 'Whether to show previews of links in the message',
					}, {
						displayName: 'Parse V Cards',
						name: 'parseVCards',
						type: 'boolean',
						default: true,
						description: 'Whether to parse vCards in the message - Whatever that means',
					}, {
						displayName: 'Reply To Message ID',
						name: 'quotedMessageId',
						type: 'string',
						default: '',
						description: 'The ID of the message to reply to',
					}, {
						displayName: 'Send Seen',
						name: 'sendSeen',
						type: 'boolean',
						default: true,
						description: 'Whether to mark all preceding messages in the chat as seen',
					}
				],
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const chatId = this.getNodeParameter('chatId', i) as string;
			validateChatId(this.getNode(), chatId);

			const messageBody = await parseMessageBody.call(this, items[i], i);

			const quotedMessageId = this.getNodeParameter('additionalOptions.quotedMessageId', i, '') as string || undefined;
			validateMessageId(this.getNode(), quotedMessageId);

			const data = {
				chatId: chatId,
				message: messageBody,
				options: {
					linkPreview: this.getNodeParameter('additionalOptions.previewLinks', i, true) as boolean,
					parseVCards: this.getNodeParameter('additionalOptions.parseVCards', i, true) as boolean,
					quotedMessageId: quotedMessageId,
					sendSeen: this.getNodeParameter('additionalOptions.sendSeen', i, true) as boolean,
				}
			}

			const response = await sendMessage.call(this, data);
			returnData.push({ json: response });
		}

		return [returnData];
	}
}
