import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import {
	ninjaOneApiRequest,
	ninjaOneApiRequestAllItems,
	extractValue,
	extractRequiredValue,
	parseDeviceIds,
} from './GenericFunctions';
import { listSearchMethods } from './ListSearchMethods';
import {
	organizationOperations,
	organizationFields,
} from './descriptions/OrganizationDescription';
import { deviceOperations, deviceFields } from './descriptions/DeviceDescription';
import { locationOperations, locationFields } from './descriptions/LocationDescription';
import { alertOperations, alertFields } from './descriptions/AlertDescription';
import { groupOperations, groupFields } from './descriptions/GroupDescription';
import { ticketOperations, ticketFields } from './descriptions/TicketDescription';
import { webhookOperations, webhookFields } from './descriptions/WebhookDescription';
import { queryOperations, queryFields } from './descriptions/QueryDescription';
import { backupOperations, backupFields } from './descriptions/BackupDescription';
import {
	windowsServiceOperations,
	windowsServiceFields,
} from './descriptions/WindowsServiceDescription';

function splitTopLevelAnd(filter: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	const normalized = filter.trim();
	for (let i = 0; i < normalized.length; i++) {
		const current = normalized[i];
		if (current === '(') depth++;
		if (current === ')') depth = Math.max(depth - 1, 0);
		if (
			depth === 0 &&
			normalized.slice(i, i + 5).toUpperCase() === ' AND ' &&
			i + 5 <= normalized.length
		) {
			parts.push(normalized.slice(start, i).trim());
			start = i + 5;
			i += 4;
		}
	}
	parts.push(normalized.slice(start).trim());
	return parts.filter(Boolean);
}

function normalizeFilterValue(value: string): string {
	return value.trim().replace(/^['"]|['"]$/g, '');
}

function getDeviceFilterFieldValue(device: IDataObject, fieldName: string): unknown {
	const normalizedField = fieldName.trim().toLowerCase();
	const fieldMap: Record<string, string> = {
		class: 'nodeClass',
		nodeclass: 'nodeClass',
		org: 'organizationId',
		organizationid: 'organizationId',
		locationid: 'locationId',
		status: 'approvalStatus',
		approvalstatus: 'approvalStatus',
		name: 'displayName',
		displayname: 'displayName',
		systemname: 'systemName',
		dnsname: 'dnsName',
		offline: 'offline',
	};
	const propertyName = fieldMap[normalizedField] ?? fieldName;
	return device[propertyName];
}

function matchesDeviceFilterClause(device: IDataObject, clause: string): boolean {
	const trimmedClause = clause
		.trim()
		.replace(/^\((.*)\)$/s, '$1')
		.trim();
	const inMatch = trimmedClause.match(/^([a-zA-Z0-9_]+)\s+in\s+\((.+)\)$/i);
	if (inMatch) {
		const [, rawField, rawValues] = inMatch;
		const deviceValue = getDeviceFilterFieldValue(device, rawField);
		if (deviceValue === undefined || deviceValue === null) {
			return false;
		}
		const acceptableValues = rawValues
			.split(',')
			.map((value) => normalizeFilterValue(value).toUpperCase());
		return acceptableValues.includes(String(deviceValue).toUpperCase());
	}
	const equalsMatch = trimmedClause.match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/i);
	if (equalsMatch) {
		const [, rawField, rawValue] = equalsMatch;
		const deviceValue = getDeviceFilterFieldValue(device, rawField);
		if (deviceValue === undefined || deviceValue === null) {
			return false;
		}
		return String(deviceValue).toUpperCase() === normalizeFilterValue(rawValue).toUpperCase();
	}
	return true;
}

function applyLocalDeviceFilter(devices: IDataObject[], deviceFilter: string): IDataObject[] {
	const clauses = splitTopLevelAnd(deviceFilter);
	return devices.filter((device) =>
		clauses.every((clause) => matchesDeviceFilterClause(device, clause)),
	);
}

export class NinjaOne implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NinjaOne RMM',
		name: 'ninjaOneRmm',
		icon: 'file:ninjaone.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with NinjaOne RMM API',
		defaults: {
			name: 'NinjaOne',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{
				name: 'ninjaOneOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Alert', value: 'alert' },
					{ name: 'Backup', value: 'backup' },
					{ name: 'Device', value: 'device' },
					{ name: 'Group', value: 'group' },
					{ name: 'Location', value: 'location' },
					{ name: 'Organization', value: 'organization' },
					{ name: 'Query', value: 'query' },
					{ name: 'Ticket', value: 'ticket' },
					{ name: 'Webhook', value: 'webhook' },
					{ name: 'Windows Service', value: 'windowsService' },
				],
				default: 'device',
			},
			// Organization
			...organizationOperations,
			...organizationFields,
			// Device
			...deviceOperations,
			...deviceFields,
			// Windows Service
			...windowsServiceOperations,
			...windowsServiceFields,
			// Location
			...locationOperations,
			...locationFields,
			// Alert
			...alertOperations,
			...alertFields,
			// Group
			...groupOperations,
			...groupFields,
			// Ticket
			...ticketOperations,
			...ticketFields,
			// Webhook
			...webhookOperations,
			...webhookFields,
			// Query
			...queryOperations,
			...queryFields,
			// Backup
			...backupOperations,
			...backupFields,
		],
	};

	methods = {
		listSearch: listSearchMethods,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] = {};

				// ==================== ORGANIZATION ====================
				if (resource === 'organization') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;

						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								'/api/v2/organizations',
							);
						} else {
							responseData = (await ninjaOneApiRequest.call(
								this,
								'GET',
								'/api/v2/organizations',
								{},
								{ pageSize: limit },
							)) as IDataObject[];
						}
					} else if (operation === 'get') {
						const orgId = extractValue(
							this.getNodeParameter('organizationId', i) as string | { value: string },
						);
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/organization/${orgId}`,
						)) as IDataObject;
					} else if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = { name, ...additionalFields };

						responseData = (await ninjaOneApiRequest.call(
							this,
							'POST',
							'/api/v2/organizations',
							body,
						)) as IDataObject;
					} else if (operation === 'update') {
						const orgId = extractValue(
							this.getNodeParameter('organizationId', i) as string | { value: string },
						);
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						responseData = (await ninjaOneApiRequest.call(
							this,
							'PATCH',
							`/api/v2/organization/${orgId}`,
							additionalFields,
						)) as IDataObject;
					}
				}

				// ==================== DEVICE ====================
				if (resource === 'device') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						const deviceOrgId = this.getNodeParameter('deviceOrgId', i, { value: '' }) as
							| { value: string }
							| string;

						const qs: IDataObject = { ...filters };

						const orgIdValue = extractValue(deviceOrgId);
						if (orgIdValue) {
							if (filters.df) {
								const orgDevices = (await ninjaOneApiRequestAllItems.call(
									this,
									'GET',
									`/api/v2/organization/${orgIdValue}/devices`,
									{},
									{},
								)) as IDataObject[];
								const filteredDevices = applyLocalDeviceFilter(
									orgDevices,
									filters.df as string,
								);
								responseData = returnAll ? filteredDevices : filteredDevices.slice(0, limit);
							} else if (returnAll) {
								responseData = await ninjaOneApiRequestAllItems.call(
									this,
									'GET',
									`/api/v2/organization/${orgIdValue}/devices`,
									{},
									qs,
								);
							} else {
								qs.pageSize = limit;
								responseData = (await ninjaOneApiRequest.call(
									this,
									'GET',
									`/api/v2/organization/${orgIdValue}/devices`,
									{},
									qs,
								)) as IDataObject[];
							}
						} else {
							if (returnAll) {
								responseData = await ninjaOneApiRequestAllItems.call(
									this,
									'GET',
									'/api/v2/devices-detailed',
									{},
									qs,
								);
							} else {
								qs.pageSize = limit;
								responseData = (await ninjaOneApiRequest.call(
									this,
									'GET',
									'/api/v2/devices-detailed',
									{},
									qs,
								)) as IDataObject[];
							}
						}
					} else if (operation === 'get') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/device/${deviceId}`,
						)) as IDataObject;
					} else if (operation === 'update') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (updateFields.displayName) {
							body.displayName = updateFields.displayName;
						}
						if (updateFields.locationId) {
							body.locationId = extractValue(updateFields.locationId as string | { value: string });
						}

						responseData = (await ninjaOneApiRequest.call(
							this,
							'PATCH',
							`/api/v2/device/${deviceId}`,
							body,
						)) as IDataObject;
					} else if (operation === 'delete') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						await ninjaOneApiRequest.call(this, 'DELETE', `/api/v2/device/${deviceId}`);
						responseData = { success: true, deviceId };
					} else if (operation === 'approval') {
						const mode = this.getNodeParameter('approvalMode', i) as string;
						const deviceIdsStr = this.getNodeParameter('approvalDeviceIds', i) as string;
						const deviceIds = parseDeviceIds(deviceIdsStr, 'Device IDs');

						responseData = (await ninjaOneApiRequest.call(
							this,
							'POST',
							`/api/v2/devices/approval/${mode}`,
							{ devices: deviceIds },
						)) as IDataObject;
					} else if (operation === 'getActivities') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;

						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/activities`,
							);
						} else {
							responseData = (await ninjaOneApiRequest.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/activities`,
								{},
								{ pageSize: limit },
							)) as IDataObject[];
						}
					} else if (operation === 'getAlerts') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;

						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/alerts`,
							);
						} else {
							responseData = (await ninjaOneApiRequest.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/alerts`,
								{},
								{ pageSize: limit },
							)) as IDataObject[];
						}
					} else if (operation === 'getSoftware') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;

						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/software`,
							);
						} else {
							responseData = (await ninjaOneApiRequest.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/software`,
								{},
								{ pageSize: limit },
							)) as IDataObject[];
						}
					} else if (operation === 'getDisks') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/device/${deviceId}/disks`,
						)) as IDataObject[];
					} else if (operation === 'getVolumes') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/device/${deviceId}/volumes`,
						)) as IDataObject[];
					} else if (operation === 'getProcessors') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/device/${deviceId}/processors`,
						)) as IDataObject[];
					} else if (operation === 'getJobs') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;

						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/jobs`,
							);
						} else {
							responseData = (await ninjaOneApiRequest.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/jobs`,
								{},
								{ pageSize: limit },
							)) as IDataObject[];
						}
					} else if (operation === 'getLastUser') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/device/${deviceId}/last-logged-on-user`,
						)) as IDataObject;
					} else if (operation === 'getDashboardUrl') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/device/${deviceId}/dashboard-url`,
						)) as IDataObject;
					} else if (operation === 'getOsPatches') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;

						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/os-patches`,
							);
						} else {
							responseData = (await ninjaOneApiRequest.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/os-patches`,
								{},
								{ pageSize: limit },
							)) as IDataObject[];
						}
					} else if (operation === 'getOsPatchInstalls') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;

						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/os-patch-installs`,
							);
						} else {
							responseData = (await ninjaOneApiRequest.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/os-patch-installs`,
								{},
								{ pageSize: limit },
							)) as IDataObject[];
						}
					} else if (operation === 'getSoftwarePatches') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;

						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/software-patches`,
							);
						} else {
							responseData = (await ninjaOneApiRequest.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/software-patches`,
								{},
								{ pageSize: limit },
							)) as IDataObject[];
						}
					} else if (operation === 'getSoftwarePatchInstalls') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;

						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/software-patch-installs`,
							);
						} else {
							responseData = (await ninjaOneApiRequest.call(
								this,
								'GET',
								`/api/v2/device/${deviceId}/software-patch-installs`,
								{},
								{ pageSize: limit },
							)) as IDataObject[];
						}
					} else if (operation === 'getPolicyOverrides') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/device/${deviceId}/policy/overrides`,
						)) as IDataObject;
					} else if (operation === 'resetPolicyOverrides') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						await ninjaOneApiRequest.call(
							this,
							'DELETE',
							`/api/v2/device/${deviceId}/policy/overrides`,
						);
						responseData = { success: true, deviceId };
					} else if (operation === 'getCustomFields') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/device/${deviceId}/custom-fields`,
						)) as IDataObject;
					} else if (operation === 'getScriptingOptions') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const lang = this.getNodeParameter('scriptingLanguage', i, '') as string;

						const qs: IDataObject = {};
						if (lang) {
							qs.lang = lang;
						}

						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/device/${deviceId}/scripting/options`,
							{},
							qs,
						)) as IDataObject;
					} else if (operation === 'updateCustomFields') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const customFieldsData = this.getNodeParameter('customFields', i) as {
							field?: Array<{ name: string | { value: string }; value: string }>;
						};

						const body: IDataObject = {};
						if (customFieldsData.field) {
							for (const field of customFieldsData.field) {
								const fieldName = extractValue(field.name);
								body[fieldName] = field.value;
							}
						}

						responseData = (await ninjaOneApiRequest.call(
							this,
							'PATCH',
							`/api/v2/device/${deviceId}/custom-fields`,
							body,
						)) as IDataObject;
					} else if (operation === 'reboot') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const rebootMode = this.getNodeParameter('rebootMode', i) as string;

						await ninjaOneApiRequest.call(
							this,
							'POST',
							`/api/v2/device/${deviceId}/reboot/${rebootMode}`,
						);
						responseData = { success: true, deviceId, rebootMode };
					} else if (operation === 'runScript') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const scriptId = extractValue(
							this.getNodeParameter('scriptId', i) as string | { value: string },
						);
						const scriptParameters = this.getNodeParameter('scriptParameters', i, '') as string;
						const runAs = this.getNodeParameter('runAs', i, '') as string;

						const scriptIdNum = parseInt(scriptId, 10);
						if (isNaN(scriptIdNum)) {
							throw new Error(`Invalid script ID: "${scriptId}". Script ID must be a number.`);
						}

						const body: IDataObject = {
							id: scriptIdNum,
							type: 'SCRIPT',
						};

						if (scriptParameters) {
							body.parameters = scriptParameters;
						}

						// Always include runAs - default to "system" if not specified
						// NinjaOne requires this field for script execution via API
						if (runAs) {
							// Try to parse as number for credential IDs, otherwise use as string
							const runAsNum = parseInt(runAs, 10);
							body.runAs = !isNaN(runAsNum) && String(runAsNum) === runAs ? runAsNum : runAs;
						} else {
							body.runAs = 'system';
						}

						responseData = (await ninjaOneApiRequest.call(
							this,
							'POST',
							`/api/v2/device/${deviceId}/script/run`,
							body,
						)) as IDataObject;
					} else if (operation === 'scheduleMaintenance') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						const start = this.getNodeParameter('maintenanceStart', i) as string;
						const end = this.getNodeParameter('maintenanceEnd', i) as string;
						const disableAlerts = this.getNodeParameter('maintenanceDisableAlerts', i) as boolean;

						const startTime = new Date(start).getTime();
						const endTime = new Date(end).getTime();
						if (isNaN(startTime) || isNaN(endTime)) {
							throw new Error('Invalid date format for maintenance start or end time.');
						}

						const body: IDataObject = {
							start: startTime / 1000,
							end: endTime / 1000,
							disabledFeatures: disableAlerts ? ['ALERTS'] : [],
						};

						responseData = (await ninjaOneApiRequest.call(
							this,
							'PUT',
							`/api/v2/device/${deviceId}/maintenance`,
							body,
						)) as IDataObject;
					} else if (operation === 'cancelMaintenance') {
						const deviceId = extractValue(
							this.getNodeParameter('deviceId', i) as string | { value: string },
						);
						await ninjaOneApiRequest.call(
							this,
							'DELETE',
							`/api/v2/device/${deviceId}/maintenance`,
						);
						responseData = { success: true, deviceId };
					}
				}

				// ==================== WINDOWS SERVICE ====================
				if (resource === 'windowsService') {
					const deviceId = extractValue(
						this.getNodeParameter('serviceDeviceId', i) as string | { value: string },
					);

					if (operation === 'getAll') {
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/device/${deviceId}/windows-services`,
						)) as IDataObject[];
					} else if (operation === 'start') {
						const serviceId = extractValue(
							this.getNodeParameter('serviceId', i) as string | { value: string },
						);
						await ninjaOneApiRequest.call(
							this,
							'POST',
							`/api/v2/device/${deviceId}/windows-service/${serviceId}/control`,
							{ action: 'START' },
						);
						responseData = { success: true, deviceId, serviceId, action: 'START' };
					} else if (operation === 'stop') {
						const serviceId = extractValue(
							this.getNodeParameter('serviceId', i) as string | { value: string },
						);
						await ninjaOneApiRequest.call(
							this,
							'POST',
							`/api/v2/device/${deviceId}/windows-service/${serviceId}/control`,
							{ action: 'STOP' },
						);
						responseData = { success: true, deviceId, serviceId, action: 'STOP' };
					} else if (operation === 'restart') {
						const serviceId = extractValue(
							this.getNodeParameter('serviceId', i) as string | { value: string },
						);
						await ninjaOneApiRequest.call(
							this,
							'POST',
							`/api/v2/device/${deviceId}/windows-service/${serviceId}/control`,
							{ action: 'RESTART' },
						);
						responseData = { success: true, deviceId, serviceId, action: 'RESTART' };
					} else if (operation === 'configure') {
						const serviceId = extractValue(
							this.getNodeParameter('serviceId', i) as string | { value: string },
						);
						const startupType = this.getNodeParameter('startupType', i) as string;
						const username = this.getNodeParameter('serviceUsername', i, '') as string;
						const password = this.getNodeParameter('servicePassword', i, '') as string;

						const body: IDataObject = { startType: startupType };
						if (username) body.userName = username;
						if (password) body.password = password;

						responseData = (await ninjaOneApiRequest.call(
							this,
							'POST',
							`/api/v2/device/${deviceId}/windows-service/${serviceId}/configure`,
							body,
						)) as IDataObject;
					}
				}

				// ==================== LOCATION ====================
				if (resource === 'location') {
					const orgId = extractValue(
						this.getNodeParameter('locationOrgId', i) as string | { value: string },
					);

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;

						const locations = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/organization/${orgId}/locations`,
						)) as IDataObject[];

						if (returnAll) {
							responseData = locations;
						} else {
							responseData = locations.slice(0, limit);
						}
					} else if (operation === 'create') {
						const name = this.getNodeParameter('locationName', i) as string;
						const additionalFields = this.getNodeParameter(
							'locationAdditionalFields',
							i,
						) as IDataObject;

						const body: IDataObject = { name, ...additionalFields };

						responseData = (await ninjaOneApiRequest.call(
							this,
							'POST',
							`/api/v2/organization/${orgId}/locations`,
							body,
						)) as IDataObject;
					} else if (operation === 'update') {
						const locationId = extractValue(
							this.getNodeParameter('locationId', i) as string | { value: string },
						);
						const additionalFields = this.getNodeParameter(
							'locationAdditionalFields',
							i,
						) as IDataObject;

						responseData = (await ninjaOneApiRequest.call(
							this,
							'PATCH',
							`/api/v2/organization/${orgId}/locations/${locationId}`,
							additionalFields,
						)) as IDataObject;
					}
				}

				// ==================== ALERT ====================
				if (resource === 'alert') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const filters = this.getNodeParameter('alertFilters', i, {}) as IDataObject;

						const qs: IDataObject = {};
						if (filters.df) qs.df = filters.df;
						if (filters.sourceType) qs.sourceType = filters.sourceType;

						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								'/api/v2/alerts',
								{},
								qs,
							);
						} else {
							qs.pageSize = limit;
							responseData = (await ninjaOneApiRequest.call(
								this,
								'GET',
								'/api/v2/alerts',
								{},
								qs,
							)) as IDataObject[];
						}
					} else if (operation === 'reset') {
						const alertUid = this.getNodeParameter('alertUid', i) as string;
						await ninjaOneApiRequest.call(this, 'DELETE', `/api/v2/alert/${alertUid}`);
						responseData = { success: true, alertUid };
					} else if (operation === 'resetWithActivity') {
						const alertUid = this.getNodeParameter('alertUid', i) as string;
						const activityType = this.getNodeParameter('resetActivityType', i, '') as string;
						const activityDataJson = this.getNodeParameter('resetActivityData', i, '{}') as string;

						const body: IDataObject = {};
						if (activityType) {
							body.type = activityType;
						}
						try {
							const activityData = JSON.parse(activityDataJson);
							Object.assign(body, activityData);
						} catch {
							// If JSON parsing fails, ignore the activity data
						}

						responseData = (await ninjaOneApiRequest.call(
							this,
							'POST',
							`/api/v2/alert/${alertUid}/reset`,
							body,
						)) as IDataObject;
					}
				}

				// ==================== GROUP ====================
				if (resource === 'group') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;

						const groups = (await ninjaOneApiRequest.call(
							this,
							'GET',
							'/api/v2/groups',
						)) as IDataObject[];

						if (returnAll) {
							responseData = groups;
						} else {
							responseData = groups.slice(0, limit);
						}
					} else if (operation === 'getDeviceIds') {
						const groupId = extractValue(
							this.getNodeParameter('groupId', i) as string | { value: string },
						);
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/group/${groupId}/device-ids`,
						)) as IDataObject[];
					}
				}

				// ==================== TICKET ====================
				if (resource === 'ticket') {
					if (operation === 'create') {
						const subject = this.getNodeParameter('ticketSubject', i) as string;
						const ticketFields = this.getNodeParameter('ticketFields', i) as IDataObject;

						const body: IDataObject = { subject };

						if (ticketFields.clientId) {
							const clientIdStr = extractValue(ticketFields.clientId as string | { value: string });
							const clientIdNum = parseInt(clientIdStr, 10);
							if (!isNaN(clientIdNum)) {
								body.clientId = clientIdNum;
							}
						}
						if (ticketFields.description) body.description = ticketFields.description;
						if (ticketFields.priority) body.priority = ticketFields.priority;
						if (ticketFields.status) body.status = ticketFields.status;

						responseData = (await ninjaOneApiRequest.call(
							this,
							'POST',
							'/api/v2/ticketing/ticket',
							body,
						)) as IDataObject;
					} else if (operation === 'update') {
						const ticketId = this.getNodeParameter('ticketId', i) as number;
						const ticketFields = this.getNodeParameter('ticketFields', i) as IDataObject;

						const body: IDataObject = {};

						if (ticketFields.clientId) {
							const clientIdStr = extractValue(ticketFields.clientId as string | { value: string });
							const clientIdNum = parseInt(clientIdStr, 10);
							if (!isNaN(clientIdNum)) {
								body.clientId = clientIdNum;
							}
						}
						if (ticketFields.description) body.description = ticketFields.description;
						if (ticketFields.priority) body.priority = ticketFields.priority;
						if (ticketFields.status) body.status = ticketFields.status;
						if (ticketFields.subject) body.subject = ticketFields.subject;

						responseData = (await ninjaOneApiRequest.call(
							this,
							'PUT',
							`/api/v2/ticketing/ticket/${ticketId}`,
							body,
						)) as IDataObject;
					} else if (operation === 'get') {
						const ticketId = this.getNodeParameter('ticketId', i) as number;
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/ticketing/ticket/${ticketId}`,
						)) as IDataObject;
					} else if (operation === 'getLogEntries') {
						const ticketId = this.getNodeParameter('ticketId', i) as number;
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/ticketing/ticket/${ticketId}/log-entry`,
						)) as IDataObject[];
					} else if (operation === 'addComment') {
						const ticketId = this.getNodeParameter('ticketId', i) as number;
						const comment = this.getNodeParameter('ticketComment', i) as string;

						responseData = (await ninjaOneApiRequest.call(
							this,
							'POST',
							`/api/v2/ticketing/ticket/${ticketId}/comment`,
							{ comment },
						)) as IDataObject;
					}
				}

				// ==================== WEBHOOK ====================
				if (resource === 'webhook') {
					if (operation === 'configure') {
						const url = this.getNodeParameter('webhookUrl', i) as string;
						const events = this.getNodeParameter('webhookEvents', i) as string[];

						const body: IDataObject = {
							url,
							events,
						};

						responseData = (await ninjaOneApiRequest.call(
							this,
							'PUT',
							'/api/v2/webhook',
							body,
						)) as IDataObject;
					} else if (operation === 'delete') {
						await ninjaOneApiRequest.call(this, 'DELETE', '/api/v2/webhook');
						responseData = { success: true };
					}
				}

				// ==================== QUERY ====================
				if (resource === 'query') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const limit = this.getNodeParameter('limit', i, 50) as number;
					const filters = this.getNodeParameter('queryFilters', i, {}) as IDataObject;

					const qs: IDataObject = {};
					if (filters.df) qs.df = filters.df;
					if (filters.since) qs.since = filters.since;

					if (operation === 'getActivities') {
						if (filters.activityType) qs.activityType = filters.activityType;

						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								'/api/v2/activities',
								{},
								qs,
								'activities',
							);
						} else {
							qs.pageSize = limit;
							const result = (await ninjaOneApiRequest.call(
								this,
								'GET',
								'/api/v2/activities',
								{},
								qs,
							)) as IDataObject;
							responseData = (result.activities as IDataObject[]) || [];
						}
					} else if (operation === 'getSoftwareInventory') {
						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								'/api/v2/queries/software',
								{},
								qs,
								'results',
							);
						} else {
							qs.pageSize = limit;
							const result = (await ninjaOneApiRequest.call(
								this,
								'GET',
								'/api/v2/queries/software',
								{},
								qs,
							)) as IDataObject;
							responseData = (result.results as IDataObject[]) || [];
						}
					} else if (operation === 'getOsPatches') {
						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								'/api/v2/queries/os-patches',
								{},
								qs,
								'results',
							);
						} else {
							qs.pageSize = limit;
							const result = (await ninjaOneApiRequest.call(
								this,
								'GET',
								'/api/v2/queries/os-patches',
								{},
								qs,
							)) as IDataObject;
							responseData = (result.results as IDataObject[]) || [];
						}
					} else if (operation === 'getAntivirusThreats') {
						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								'/api/v2/queries/antivirus-threats',
								{},
								qs,
								'results',
							);
						} else {
							qs.pageSize = limit;
							const result = (await ninjaOneApiRequest.call(
								this,
								'GET',
								'/api/v2/queries/antivirus-threats',
								{},
								qs,
							)) as IDataObject;
							responseData = (result.results as IDataObject[]) || [];
						}
					} else if (operation === 'getDeviceHealth') {
						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								'/api/v2/queries/device-health',
								{},
								qs,
								'results',
							);
						} else {
							qs.pageSize = limit;
							const result = (await ninjaOneApiRequest.call(
								this,
								'GET',
								'/api/v2/queries/device-health',
								{},
								qs,
							)) as IDataObject;
							responseData = (result.results as IDataObject[]) || [];
						}
					} else if (operation === 'getCustomFields') {
						if (filters.fields) qs.fields = filters.fields;

						if (returnAll) {
							responseData = await ninjaOneApiRequestAllItems.call(
								this,
								'GET',
								'/api/v2/queries/custom-fields',
								{},
								qs,
								'results',
							);
						} else {
							qs.pageSize = limit;
							const result = (await ninjaOneApiRequest.call(
								this,
								'GET',
								'/api/v2/queries/custom-fields',
								{},
								qs,
							)) as IDataObject;
							responseData = (result.results as IDataObject[]) || [];
						}
					}
				}

				// ==================== BACKUP ====================
				if (resource === 'backup') {
					const operationPath: Record<string, string> = {
						getJobs: '/api/v2/backup/jobs',
						getIntegrityCheckJobs: '/api/v2/backup/integrity-check-jobs',
						getDeviceUsage: '/api/v2/queries/backup/usage',
					};

					if (
						operation === 'getJobs' ||
						operation === 'getIntegrityCheckJobs' ||
						operation === 'getDeviceUsage'
					) {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const endpoint = operationPath[operation];
						const backupFilters = this.getNodeParameter('backupFilters', i, {}) as IDataObject;
						const qs: IDataObject = {};

						if (operation === 'getJobs' || operation === 'getIntegrityCheckJobs') {
							if (backupFilters.df) qs.df = backupFilters.df;
							if (backupFilters.ddf) qs.ddf = backupFilters.ddf;
							if (backupFilters.sf) qs.sf = backupFilters.sf;
							if (backupFilters.ptf) qs.ptf = backupFilters.ptf;
							if (backupFilters.stf) qs.stf = backupFilters.stf;
							if (backupFilters.include) qs.include = backupFilters.include;
						}

						if (operation === 'getDeviceUsage') {
							const includeDeletedDevices = this.getNodeParameter(
								'includeDeletedDevices',
								i,
								false,
							) as boolean;
							qs.includeDeletedDevices = includeDeletedDevices;
						}

						if (!returnAll) {
							qs.pageSize = limit;
							const result = (await ninjaOneApiRequest.call(
								this,
								'GET',
								endpoint,
								{},
								qs,
							)) as IDataObject;
							responseData = (result.results as IDataObject[]) || [];
						} else {
							const allItems: IDataObject[] = [];
							const pageSize = 100;
							let cursor: string | undefined;
							do {
								const pageQs: IDataObject = { ...qs, pageSize };
								if (cursor) {
									pageQs.cursor = cursor;
								}
								const result = (await ninjaOneApiRequest.call(
									this,
									'GET',
									endpoint,
									{},
									pageQs,
								)) as IDataObject;
								const items = (result.results as IDataObject[]) || [];
								allItems.push(...items);
								const cursorObj = result.cursor as string | { name?: string } | undefined;
								cursor = typeof cursorObj === 'string' ? cursorObj : cursorObj?.name;
							} while (cursor);
							responseData = allItems;
						}
					} else if (operation === 'submitIntegrityCheckJob') {
						const deviceId = parseInt(
							extractRequiredValue(
								this.getNodeParameter('backupDeviceId', i) as string | { value: string },
								'Device',
							),
							10,
						);
						const planUid = this.getNodeParameter('planUid', i) as string;
						responseData = (await ninjaOneApiRequest.call(
							this,
							'POST',
							'/api/v2/backup/integrity-check-jobs',
							{ deviceId, planUid },
						)) as IDataObject;
					} else if (operation === 'setBandwidthThrottle') {
						const deviceId = parseInt(
							extractRequiredValue(
								this.getNodeParameter('backupDeviceId', i) as string | { value: string },
								'Device',
							),
							10,
						);
						const bandwidthThrottleJson = this.getNodeParameter(
							'bandwidthThrottle',
							i,
							'{}',
						) as string;
						let bandwidthThrottle: IDataObject = {};
						try {
							bandwidthThrottle = JSON.parse(bandwidthThrottleJson) as IDataObject;
						} catch {
							bandwidthThrottle = {};
						}
						responseData = (await ninjaOneApiRequest.call(
							this,
							'POST',
							'/api/v2/backup/bandwidth-throttle',
							{ deviceId, bandwidthThrottle },
						)) as IDataObject;
					} else if (operation === 'getOrganizationLocationsUsage') {
						const organizationId = extractRequiredValue(
							this.getNodeParameter('backupOrganizationId', i) as string | { value: string },
							'Organization',
						);
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/organization/${organizationId}/locations/backup/usage`,
						)) as IDataObject;
					} else if (operation === 'getOrganizationLocationUsage') {
						const organizationId = extractRequiredValue(
							this.getNodeParameter('backupOrganizationId', i) as string | { value: string },
							'Organization',
						);
						const locationId = extractRequiredValue(
							this.getNodeParameter('backupLocationId', i) as string | { value: string },
							'Location',
						);
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/organization/${organizationId}/locations/${locationId}/backup/usage`,
						)) as IDataObject;
					}
				}

				// ==================== SYSTEM ====================
				if (resource === 'system') {
					if (operation === 'getAttachment') {
						const attachmentId = this.getNodeParameter('attachmentId', i) as string;
						responseData = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/attachment/${attachmentId}`,
						)) as IDataObject;
					}
				}

				// Return data
				if (Array.isArray(responseData)) {
					returnData.push(
						...responseData.map((item) => ({
							json: item,
							pairedItem: { item: i },
						})),
					);
				} else {
					returnData.push({
						json: responseData,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
