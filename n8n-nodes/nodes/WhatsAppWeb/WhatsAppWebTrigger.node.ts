import { IHookFunctions, INodeType, INodeTypeDescription, IWebhookFunctions, IWebhookResponseData, NodeConnectionType } from "n8n-workflow";
import { deleteWebhook, getWebhooks, subscribeWebhook } from "./api/webHooks";

export class WhatsAppWebTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: "WhatsApp Web Trigger",
		name: "whatsAppWebTrigger",
		icon: { light: "file:whatsappweb_light.svg", dark: "file:whatsappweb_dark.svg" },
		group: ["trigger"],
		version: 1,
		description: "Handle WhatsApp Web events",
		defaults: {
			name: "WhatsApp Web Trigger",
		},
		inputs: [],
		/* eslint-disable n8n-nodes-base/node-class-description-outputs-wrong */
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: "whatsAppWebApi",
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			}
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Message Received',
						value: 'messageReceived',
						description: 'Triggered when a WhatsApp message is received',
					}
				],
				default: 'messageReceived',
				required: true,
				description: 'Event that this node listens to',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhooks = await getWebhooks.call(this);
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				for (const webhook of webhooks) {
					if (webhook.url === webhookUrl) {
						const webhookData = this.getWorkflowStaticData('node');
						webhookData.webhookId = webhook.id as string;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const result = await subscribeWebhook.call(this, webhookUrl);
				if (result.id === undefined) return false;

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = result.id as string;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) return true;

				const result = await deleteWebhook.call(this, webhookData.webhookId as string);
				if (!result.success) return false;

				return false;
			},
		},
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as any;
		if (!body.data.hasMedia || !body.data.media.saved) {
			return { workflowData: [this.helpers.returnJsonArray(body)] };
		}

		const credentials = await this.getCredentials("whatsAppWebApi");
		const url = `${credentials.apiUrl}${body.data.media.fileLocation}`;

		const file = await this.helpers.request({
			headers: { Authorization: `Bearer ${credentials.apiKey}` },
			json: false,
			encoding: null,
			url: url,
			resolveWithFullResponse: true,
			method: 'GET',
		});

		const data = Buffer.from(file.body);
		const fileName = body.data.media.fileLocation.split('/').pop() as string;
		const binaryData = await this.helpers.prepareBinaryData(data, fileName);

		return {
			workflowData: [
				[
					{
						json: body,
						binary: {
							messageMedia: binaryData,
						},
					},
				],
			],
		};
	}
}
