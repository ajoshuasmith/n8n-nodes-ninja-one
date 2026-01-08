import type { INodeProperties } from 'n8n-workflow';

export const alertOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['alert'] } },
		options: [
			{ name: 'Get Many', value: 'getAll', action: 'Get many alerts' },
			{ name: 'Reset', value: 'reset', action: 'Reset an alert' },
			{ name: 'Reset with Activity', value: 'resetWithActivity', action: 'Reset alert with custom activity' },
		],
		default: 'getAll',
	},
];

export const alertFields: INodeProperties[] = [
	{
		displayName: 'Alert UID',
		name: 'alertUid',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g., abc-123 or {{ $json.uid }}',
		displayOptions: { show: { resource: ['alert'], operation: ['reset', 'resetWithActivity'] } },
		description: 'The unique identifier of the alert to reset. Supports expressions.',
	},
	{
		displayName: 'Activity Type',
		name: 'resetActivityType',
		type: 'string',
		default: '',
		placeholder: 'e.g., CONDITION_RESET or {{ $json.type }}',
		displayOptions: { show: { resource: ['alert'], operation: ['resetWithActivity'] } },
		description: 'The type of activity to record. Supports expressions.',
	},
	{
		displayName: 'Activity Data',
		name: 'resetActivityData',
		type: 'json',
		default: '{}',
		displayOptions: { show: { resource: ['alert'], operation: ['resetWithActivity'] } },
		description: 'Custom activity data as JSON object',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['alert'], operation: ['getAll'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		displayOptions: { show: { resource: ['alert'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 1000 },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'alertFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['alert'], operation: ['getAll'] } },
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
				displayName: 'Source Type',
				name: 'sourceType',
				type: 'options',
				options: [
					{ name: 'All', value: '' },
					{ name: 'Condition', value: 'CONDITION' },
					{ name: 'Condition Action Failure', value: 'CONDITION_ACTION_FAILURE' },
				],
				default: '',
				description: 'Filter by alert source type',
			},
		],
	},
];
