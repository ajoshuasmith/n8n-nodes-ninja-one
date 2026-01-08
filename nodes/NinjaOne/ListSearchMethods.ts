import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	IDataObject,
} from 'n8n-workflow';
import { ninjaOneApiRequest, extractValue } from './GenericFunctions';

export const listSearchMethods = {
	async searchOrganizations(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		const pageSize = 100;
		const qs: IDataObject = { pageSize };

		if (paginationToken) {
			qs.after = paginationToken;
		}

		try {
			const orgs = (await ninjaOneApiRequest.call(
				this,
				'GET',
				'/api/v2/organizations',
				{},
				qs,
			)) as IDataObject[];

			let results = orgs.map((org) => ({
				name: org.name as string,
				value: String(org.id),
			}));

			if (filter) {
				const lowerFilter = filter.toLowerCase();
				results = results.filter((r) => r.name.toLowerCase().includes(lowerFilter));
			}

			return {
				results,
				paginationToken: orgs.length === pageSize ? String(orgs.length) : undefined,
			};
		} catch {
			return { results: [] };
		}
	},

	async searchDevices(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		const pageSize = 100;
		const qs: IDataObject = { pageSize };

		if (paginationToken) {
			qs.after = paginationToken;
		}

		try {
			const devices = (await ninjaOneApiRequest.call(
				this,
				'GET',
				'/api/v2/devices-detailed',
				{},
				qs,
			)) as IDataObject[];

			let results = devices.map((device) => ({
				name: `${device.systemName || device.dnsName || 'Unknown'} (${device.organizationName || 'N/A'})`,
				value: String(device.id),
			}));

			if (filter) {
				const lowerFilter = filter.toLowerCase();
				results = results.filter((r) => r.name.toLowerCase().includes(lowerFilter));
			}

			return {
				results,
				paginationToken: devices.length === pageSize ? String(devices.length) : undefined,
			};
		} catch {
			return { results: [] };
		}
	},

	async searchLocations(
		this: ILoadOptionsFunctions,
		filter?: string,
	): Promise<INodeListSearchResult> {
		try {
			const MAX_ORGS = 50;
			const BATCH_SIZE = 10;

			const orgs = (await ninjaOneApiRequest.call(
				this,
				'GET',
				'/api/v2/organizations',
				{},
				{ pageSize: MAX_ORGS },
			)) as IDataObject[];

			const results: { name: string; value: string }[] = [];

			for (let i = 0; i < orgs.length; i += BATCH_SIZE) {
				const batch = orgs.slice(i, i + BATCH_SIZE);

				const locationPromises = batch.map(async (org) => {
					try {
						const locations = (await ninjaOneApiRequest.call(
							this,
							'GET',
							`/api/v2/organization/${org.id}/locations`,
							{},
							{},
						)) as IDataObject[];

						return locations.map((loc) => ({
							name: `${loc.name} (${org.name})`,
							value: String(loc.id),
						}));
					} catch {
						return [];
					}
				});

				const batchResults = await Promise.all(locationPromises);
				results.push(...batchResults.flat());
			}

			if (filter) {
				const lowerFilter = filter.toLowerCase();
				return {
					results: results.filter((r) => r.name.toLowerCase().includes(lowerFilter)),
				};
			}

			return { results };
		} catch {
			return { results: [] };
		}
	},

	async searchGroups(
		this: ILoadOptionsFunctions,
		filter?: string,
	): Promise<INodeListSearchResult> {
		try {
			const groups = (await ninjaOneApiRequest.call(
				this,
				'GET',
				'/api/v2/groups',
				{},
				{},
			)) as IDataObject[];

			let results = groups.map((group) => ({
				name: group.name as string,
				value: String(group.id),
			}));

			if (filter) {
				const lowerFilter = filter.toLowerCase();
				results = results.filter((r) => r.name.toLowerCase().includes(lowerFilter));
			}

			return { results };
		} catch {
			return { results: [] };
		}
	},

	async searchScripts(
		this: ILoadOptionsFunctions,
		filter?: string,
	): Promise<INodeListSearchResult> {
		try {
			const scripts = (await ninjaOneApiRequest.call(
				this,
				'GET',
				'/api/v2/automation/scripts',
				{},
				{},
			)) as IDataObject[];

			let results = scripts.map((script) => ({
				name: script.name as string,
				value: String(script.id),
			}));

			if (filter) {
				const lowerFilter = filter.toLowerCase();
				results = results.filter((r) => r.name.toLowerCase().includes(lowerFilter));
			}

			return { results };
		} catch {
			return { results: [] };
		}
	},

	async searchCustomFields(
		this: ILoadOptionsFunctions,
		filter?: string,
	): Promise<INodeListSearchResult> {
		try {
			const fields = (await ninjaOneApiRequest.call(
				this,
				'GET',
				'/api/v2/device-custom-fields',
				{},
				{},
			)) as IDataObject[];

			let results = fields.map((field) => ({
				name: `${field.label || field.name} (${field.name})`,
				value: field.name as string,
			}));

			if (filter) {
				const lowerFilter = filter.toLowerCase();
				results = results.filter((r) => r.name.toLowerCase().includes(lowerFilter));
			}

			return { results };
		} catch {
			return { results: [] };
		}
	},

	async searchWindowsServices(
		this: ILoadOptionsFunctions,
		filter?: string,
	): Promise<INodeListSearchResult> {
		try {
			const deviceId = this.getNodeParameter('serviceDeviceId', 0) as
				| string
				| { value: string };
			const deviceIdValue = extractValue(deviceId);

			if (!deviceIdValue) {
				return { results: [] };
			}

			const services = (await ninjaOneApiRequest.call(
				this,
				'GET',
				`/api/v2/device/${deviceIdValue}/windows-services`,
				{},
				{},
			)) as IDataObject[];

			let results = services.map((service) => ({
				name: `${service.displayName || service.name} (${service.name})`,
				value: service.name as string,
			}));

			if (filter) {
				const lowerFilter = filter.toLowerCase();
				results = results.filter((r) => r.name.toLowerCase().includes(lowerFilter));
			}

			return { results };
		} catch {
			return { results: [] };
		}
	},
};
