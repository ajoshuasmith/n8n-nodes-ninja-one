import type { INodeProperties } from 'n8n-workflow';

export const organizationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['organization'],
			},
		},
		options: [
			{ name: 'Create', value: 'create', action: 'Create an organization' },
			{ name: 'Get', value: 'get', action: 'Get an organization' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many organizations' },
			{ name: 'Update', value: 'update', action: 'Update an organization' },
		],
		default: 'getAll',
	},
];

export const organizationFields: INodeProperties[] = [
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['organization'],
				operation: ['get', 'update'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchOrganizations',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g., 1 or {{ $json.orgId }}',
			},
		],
		description: 'The organization to operate on. Supports expressions.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g., Acme Corp or {{ $json.orgName }}',
		displayOptions: {
			show: {
				resource: ['organization'],
				operation: ['create'],
			},
		},
		description: 'Name of the organization. Supports expressions.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['organization'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				resource: ['organization'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['organization'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: 'e.g., Company description or {{ $json.desc }}',
				description: 'Description of the organization. Supports expressions.',
			},
			{
				displayName: 'Node Approval Mode',
				name: 'nodeApprovalMode',
				type: 'options',
				options: [
					{ name: 'Automatic', value: 'AUTOMATIC' },
					{ name: 'Manual', value: 'MANUAL' },
					{ name: 'Reject', value: 'REJECT' },
				],
				default: 'AUTOMATIC',
				description: 'How new devices are approved',
			},
		],
	},
];
