import type { INodeProperties } from 'n8n-workflow';

export const windowsServiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['windowsService'] } },
		options: [
			{ name: 'Configure', value: 'configure', action: 'Configure a Windows service' },
			{ name: 'Get Many', value: 'getAll', action: 'Get Windows services on a device' },
			{ name: 'Restart', value: 'restart', action: 'Restart a Windows service' },
			{ name: 'Start', value: 'start', action: 'Start a Windows service' },
			{ name: 'Stop', value: 'stop', action: 'Stop a Windows service' },
		],
		default: 'getAll',
	},
];

export const windowsServiceFields: INodeProperties[] = [
	{
		displayName: 'Device',
		name: 'serviceDeviceId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: { resource: ['windowsService'] } },
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
		description: 'The device to manage services on. Supports expressions.',
	},
	{
		displayName: 'Service',
		name: 'serviceId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: { resource: ['windowsService'], operation: ['start', 'stop', 'restart', 'configure'] } },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchWindowsServices', searchable: true },
			},
			{ displayName: 'By Name', name: 'id', type: 'string', placeholder: 'Spooler' },
		],
		description: 'The service to control',
	},
	{
		displayName: 'Startup Type',
		name: 'startupType',
		type: 'options',
		default: 'AUTO_START',
		required: true,
		displayOptions: { show: { resource: ['windowsService'], operation: ['configure'] } },
		options: [
			{ name: 'Automatic', value: 'AUTO_START' },
			{ name: 'Automatic (Delayed)', value: 'AUTO_START_DELAYED' },
			{ name: 'Manual', value: 'DEMAND_START' },
			{ name: 'Disabled', value: 'DISABLED' },
		],
		description: 'The startup type for the service',
	},
	{
		displayName: 'Username',
		name: 'serviceUsername',
		type: 'string',
		default: '',
		placeholder: 'e.g., DOMAIN\\user or {{ $json.serviceUser }}',
		displayOptions: { show: { resource: ['windowsService'], operation: ['configure'] } },
		description: 'Username for the service account (optional). Supports expressions.',
	},
	{
		displayName: 'Password',
		name: 'servicePassword',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		placeholder: '{{ $json.servicePassword }}',
		displayOptions: { show: { resource: ['windowsService'], operation: ['configure'] } },
		description: 'Password for the service account (optional). Supports expressions for secure credential retrieval.',
	},
];
