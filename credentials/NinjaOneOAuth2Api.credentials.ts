import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class NinjaOneOAuth2Api implements ICredentialType {
	name = 'ninjaOneOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'NinjaOne OAuth2 API';
	documentationUrl = 'https://www.ninjaone.com/docs/integrations/how-to-set-up-api-oauth-token/';

	properties: INodeProperties[] = [
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			default: 'app',
			options: [
				{
					name: 'United States',
					value: 'app',
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
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '=https://{{$self.region}}.ninjarmm.com/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '=https://{{$self.region}}.ninjarmm.com/oauth/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'monitoring management control offline_access',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
