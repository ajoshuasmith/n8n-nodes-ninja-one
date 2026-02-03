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
import {
	windowsServiceOperations,
	windowsServiceFields,
} from './descriptions/WindowsServiceDescription';

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
							if (returnAll) {
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

						const body: IDataObject = {
							id: parseInt(scriptId, 10),
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

						const body: IDataObject = {
							start: new Date(start).getTime() / 1000,
							end: new Date(end).getTime() / 1000,
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
							body.clientId = parseInt(
								extractValue(ticketFields.clientId as string | { value: string }),
								10,
							);
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
							body.clientId = parseInt(
								extractValue(ticketFields.clientId as string | { value: string }),
								10,
							);
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
