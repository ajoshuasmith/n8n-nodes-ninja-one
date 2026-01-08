import type { INodeProperties } from 'n8n-workflow';

export const locationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['location'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a location' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many locations' },
			{ name: 'Update', value: 'update', action: 'Update a location' },
		],
		default: 'getAll',
	},
];

export const locationFields: INodeProperties[] = [
	{
		displayName: 'Organization',
		name: 'locationOrgId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: { resource: ['location'] } },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchOrganizations', searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g., 1 or {{ $json.orgId }}',
			},
		],
		description: 'The organization the location belongs to. Supports expressions.',
	},
	{
		displayName: 'Location',
		name: 'locationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: { resource: ['location'], operation: ['update'] } },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchLocations', searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g., 1 or {{ $json.locationId }}',
			},
		],
		description: 'The location to update. Supports expressions.',
	},
	{
		displayName: 'Name',
		name: 'locationName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g., Main Office or {{ $json.locationName }}',
		displayOptions: { show: { resource: ['location'], operation: ['create'] } },
		description: 'Name of the location. Supports expressions.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['location'], operation: ['getAll'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		displayOptions: { show: { resource: ['location'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 1000 },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'locationAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['location'], operation: ['create', 'update'] } },
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				placeholder: 'e.g., 123 Main St or {{ $json.address }}',
				description: 'Address of the location. Supports expressions.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: 'e.g., Main office or {{ $json.locationDesc }}',
				description: 'Description of the location. Supports expressions.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g., New Location Name or {{ $json.name }}',
				description: 'Name of the location (for update). Supports expressions.',
				displayOptions: { show: { '/operation': ['update'] } },
			},
		],
	},
];
