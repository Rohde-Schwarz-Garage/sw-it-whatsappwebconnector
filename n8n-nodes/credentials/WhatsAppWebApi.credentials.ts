import { ICredentialType, INodeProperties } from "n8n-workflow";

export class WhatsAppWebApi implements ICredentialType {
	name = 'whatsAppWebApi';

	displayName = 'WhatsApp Web API';

	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: '',
			description: 'The base URL of the WhatsApp Web Server API. For example, "http://localhost:8080". Do not include trailing slashes!',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			typeOptions: { password: true },
			description: 'The API key for authentication with the WhatsApp Web Server API',
			required: true,
		}
	];
}
