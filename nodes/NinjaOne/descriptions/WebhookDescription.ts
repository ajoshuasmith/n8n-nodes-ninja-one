import type { INodeProperties } from 'n8n-workflow';

export const webhookOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['webhook'] } },
		options: [
			{ name: 'Configure', value: 'configure', action: 'Configure webhook' },
			{ name: 'Delete', value: 'delete', action: 'Delete webhook' },
		],
		default: 'configure',
	},
];

export const webhookFields: INodeProperties[] = [
	{
		displayName: 'Webhook URL',
		name: 'webhookUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g., https://example.com/webhook or {{ $json.webhookUrl }}',
		displayOptions: { show: { resource: ['webhook'], operation: ['configure'] } },
		description: 'The URL to send webhook events to. Supports expressions.',
	},
	{
		displayName: 'Events',
		name: 'webhookEvents',
		type: 'multiOptions',
		default: [],
		displayOptions: { show: { resource: ['webhook'], operation: ['configure'] } },
		options: [
			{ name: 'Activity Added', value: 'ACTIVITY_ADDED' },
			{ name: 'Alert Triggered', value: 'ALERT_TRIGGERED' },
			{ name: 'Alert Reset', value: 'ALERT_RESET' },
			{ name: 'Device Added', value: 'DEVICE_ADDED' },
			{ name: 'Device Approval Changed', value: 'DEVICE_APPROVAL_CHANGED' },
			{ name: 'Device Deleted', value: 'DEVICE_DELETED' },
		],
		description: 'Events to subscribe to',
	},
];
