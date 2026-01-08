import type { INodeProperties } from 'n8n-workflow';

export const groupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['group'] } },
		options: [
			{ name: 'Get Device IDs', value: 'getDeviceIds', action: 'Get device IDs in a group' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many groups' },
		],
		default: 'getAll',
	},
];

export const groupFields: INodeProperties[] = [
	{
		displayName: 'Group',
		name: 'groupId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: { resource: ['group'], operation: ['getDeviceIds'] } },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchGroups', searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g., 1 or {{ $json.groupId }}',
			},
		],
		description: 'The group to get device IDs from. Supports expressions.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['group'], operation: ['getAll'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		displayOptions: { show: { resource: ['group'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 1000 },
		description: 'Max number of results to return',
	},
];
