import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class NinjaOneApi implements ICredentialType {
	name = 'ninjaOneApi';
	displayName = 'NinjaOne API';
	documentationUrl = 'https://www.ninjaone.com/docs/integrations/how-to-set-up-api-oauth-token/';

	properties: INodeProperties[] = [
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			default: 'us',
			options: [
				{
					name: 'United States',
					value: 'us',
				},
				{
					name: 'Europe',
					value: 'eu',
				},
				{
					name: 'Oceania',
					value: 'oc',
				},
			],
			description: 'The region of your NinjaOne instance',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			description: 'The Client ID from your NinjaOne API application',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The Client Secret from your NinjaOne API application',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'options',
			default: 'monitoring management',
			options: [
				{
					name: 'Monitoring Only',
					value: 'monitoring',
				},
				{
					name: 'Monitoring + Management',
					value: 'monitoring management',
				},
				{
					name: 'Monitoring + Management + Control',
					value: 'monitoring management control',
				},
			],
			description: 'The permission scope for API access',
		},
	];

	// Note: Authentication is handled via OAuth2 Client Credentials flow in GenericFunctions.ts
	// The node fetches and caches access tokens automatically using the clientId and clientSecret
}
