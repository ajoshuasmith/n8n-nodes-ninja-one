import type { INodeProperties } from 'n8n-workflow';

export const backupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['backup'] } },
		options: [
			{ name: 'Get Device Usage', value: 'getDeviceUsage', action: 'Get backup usage by device' },
			{
				name: 'Get Integrity Check Jobs',
				value: 'getIntegrityCheckJobs',
				action: 'Get backup integrity check jobs',
			},
			{ name: 'Get Jobs', value: 'getJobs', action: 'Get backup jobs' },
			{
				name: 'Get Organization Location Usage',
				value: 'getOrganizationLocationUsage',
				action: 'Get backup usage for one location',
			},
			{
				name: 'Get Organization Locations Usage',
				value: 'getOrganizationLocationsUsage',
				action: 'Get backup usage for all organization locations',
			},
			{
				name: 'Set Bandwidth Throttle',
				value: 'setBandwidthThrottle',
				action: 'Set backup bandwidth throttle for a device',
			},
			{
				name: 'Submit Integrity Check Job',
				value: 'submitIntegrityCheckJob',
				action: 'Create backup integrity check job',
			},
		],
		default: 'getJobs',
	},
];

export const backupFields: INodeProperties[] = [
	{
		displayName: 'Device',
		name: 'backupDeviceId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['setBandwidthThrottle', 'submitIntegrityCheckJob'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchDevices', searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g., 1 or {{ $json.deviceId }}',
			},
		],
		description: 'Device to use for backup operation. Supports expressions.',
	},
	{
		displayName: 'Plan UID',
		name: 'planUid',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g., 123e4567-e89b-12d3-a456-426614174000',
		displayOptions: { show: { resource: ['backup'], operation: ['submitIntegrityCheckJob'] } },
		description: 'Backup plan UUID.',
	},
	{
		displayName: 'Bandwidth Throttle',
		name: 'bandwidthThrottle',
		type: 'json',
		default: '{\n  "enabled": true,\n  "workHoursKbps": 1024,\n  "nonWorkHoursKbps": 2048\n}',
		displayOptions: { show: { resource: ['backup'], operation: ['setBandwidthThrottle'] } },
		description: 'Backup bandwidth throttle object as JSON.',
	},
	{
		displayName: 'Organization',
		name: 'backupOrganizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['getOrganizationLocationsUsage', 'getOrganizationLocationUsage'],
			},
		},
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
		description: 'Organization to query. Supports expressions.',
	},
	{
		displayName: 'Location',
		name: 'backupLocationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: { resource: ['backup'], operation: ['getOrganizationLocationUsage'] } },
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
				placeholder: 'e.g., 10 or {{ $json.locationId }}',
			},
		],
		description: 'Location to query. Supports expressions.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['getJobs', 'getIntegrityCheckJobs', 'getDeviceUsage'],
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
				resource: ['backup'],
				operation: ['getJobs', 'getIntegrityCheckJobs', 'getDeviceUsage'],
				returnAll: [false],
			},
		},
		typeOptions: { minValue: 1, maxValue: 1000 },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Include Deleted Devices',
		name: 'includeDeletedDevices',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['backup'], operation: ['getDeviceUsage'] } },
		description: 'Whether to include deleted devices in backup usage query',
	},
	{
		displayName: 'Filters',
		name: 'backupFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['getJobs', 'getIntegrityCheckJobs'],
			},
		},
		options: [
			{
				displayName: 'Device Filter',
				name: 'df',
				type: 'string',
				default: '',
				placeholder: 'e.g., status=APPROVED or {{ $json.filter }}',
				description: 'Device filter query string.',
			},
			{
				displayName: 'Device Detailed Filter',
				name: 'ddf',
				type: 'string',
				default: '',
				placeholder: 'e.g., role=WINDOWS_SERVER',
				description: 'Device detailed filter query string.',
			},
			{
				displayName: 'Size Filter',
				name: 'sf',
				type: 'string',
				default: '',
				placeholder: 'e.g., totalStoredBytes>0',
				description: 'Backup size filter query string.',
			},
			{
				displayName: 'Plan Type Filter',
				name: 'ptf',
				type: 'string',
				default: '',
				placeholder: 'e.g., FILE_FOLDER',
				description: 'Plan type filter query string.',
			},
			{
				displayName: 'Status Type Filter',
				name: 'stf',
				type: 'string',
				default: '',
				placeholder: 'e.g., FAILED',
				description: 'Status filter query string.',
			},
			{
				displayName: 'Include',
				name: 'include',
				type: 'string',
				default: '',
				placeholder: 'e.g., organization,location,device',
				description: 'Comma-separated related entities to include.',
			},
		],
	},
];
