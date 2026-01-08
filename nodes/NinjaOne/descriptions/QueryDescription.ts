import type { INodeProperties } from 'n8n-workflow';

export const queryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['query'] } },
		options: [
			{ name: 'Get Activities', value: 'getActivities', action: 'Get all activities' },
			{ name: 'Get Antivirus Threats', value: 'getAntivirusThreats', action: 'Get antivirus threats' },
			{ name: 'Get Device Health', value: 'getDeviceHealth', action: 'Get device health summary' },
			{ name: 'Get OS Patches', value: 'getOsPatches', action: 'Get all OS patches' },
			{ name: 'Get Software Inventory', value: 'getSoftwareInventory', action: 'Get software inventory' },
		],
		default: 'getActivities',
	},
];

export const queryFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['query'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		displayOptions: { show: { resource: ['query'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 1000 },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'queryFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['query'] } },
		options: [
			{
				displayName: 'Device Filter',
				name: 'df',
				type: 'string',
				default: '',
				placeholder: 'e.g., status=APPROVED or {{ $json.filter }}',
				description: 'Device filter query string. Supports expressions for dynamic filtering.',
			},
			{
				displayName: 'Activity Type',
				name: 'activityType',
				type: 'string',
				default: '',
				placeholder: 'e.g., LOGIN or {{ $json.activityType }}',
				description: 'Filter by activity type (for activities query). Supports expressions.',
				displayOptions: { show: { '/operation': ['getActivities'] } },
			},
			{
				displayName: 'Since (Timestamp)',
				name: 'since',
				type: 'number',
				default: 0,
				description: 'Return results since this Unix timestamp',
			},
		],
	},
];
