import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

// Maximum retries for rate-limited requests
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function getBaseUrl(region: string): string {
	switch (region) {
		case 'eu':
			return 'https://eu.ninjarmm.com';
		case 'oc':
			return 'https://oc.ninjarmm.com';
		case 'app':
		case 'us':
		default:
			return 'https://app.ninjarmm.com';
	}
}

interface CredentialInfo {
	accessToken: string;
	baseUrl: string;
}

/**
 * Gets OAuth2 credentials and access token
 */
async function getCredentialInfo(
	context: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<CredentialInfo> {
	const credentials = await context.getCredentials('ninjaOneOAuth2Api');
	const region = credentials.region as string;
	const baseUrl = getBaseUrl(region);

	// n8n manages OAuth2 tokens - access via oauthTokenData
	const tokenData = credentials.oauthTokenData as { access_token?: string } | undefined;

	if (!tokenData?.access_token) {
		throw new NodeApiError(context.getNode(), {} as JsonObject, {
			message: 'No OAuth token found. Please reconnect your NinjaOne OAuth2 credential.',
		});
	}

	return {
		accessToken: tokenData.access_token,
		baseUrl,
	};
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validates and sanitizes an ID value for use in API paths
 * Prevents path traversal and injection attacks
 */
export function sanitizeId(id: string, fieldName: string): string {
	if (!id || typeof id !== 'string') {
		throw new Error(`${fieldName} is required`);
	}

	const trimmed = id.trim();

	// Check for path traversal attempts
	if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
		throw new Error(`Invalid ${fieldName}: contains invalid characters`);
	}

	// For numeric IDs, validate they're actually numeric
	// Allow non-numeric IDs for things like alert UIDs which can be alphanumeric
	if (/^[0-9]+$/.test(trimmed) || /^[a-zA-Z0-9-_]+$/.test(trimmed)) {
		return trimmed;
	}

	throw new Error(`Invalid ${fieldName}: must be alphanumeric`);
}

export async function getAccessToken(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<string> {
	const credInfo = await getCredentialInfo(this);
	return credInfo.accessToken;
}

export async function ninjaOneApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	retryCount = 0,
): Promise<IDataObject | IDataObject[]> {
	const credentials = await this.getCredentials('ninjaOneOAuth2Api');
	const region = credentials.region as string;
	const baseUrl = getBaseUrl(region);

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
		},
		qs,
		json: true,
	};

	if (Object.keys(body).length > 0 && method !== 'GET') {
		options.body = body;
	}

	try {
		// Use httpRequestWithAuthentication for automatic OAuth2 token refresh
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'ninjaOneOAuth2Api',
			options,
		);
		return response as IDataObject | IDataObject[];
	} catch (error) {
		const err = error as { response?: { status?: number }; message?: string };

		// On 401, retry once to give n8n another chance to refresh the OAuth2 token.
		// httpRequestWithAuthentication checks token expiry before the request, but if
		// the token expires between the check and the actual API call (or if n8n's
		// expiry tracking is stale), the first request fails. Retrying triggers a
		// fresh expiry check which detects the now-expired token and refreshes it.
		if (err.response?.status === 401 && retryCount === 0) {
			await sleep(1000);
			return ninjaOneApiRequest.call(this, method, endpoint, body, qs, 1);
		}

		if (err.response?.status === 401) {
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: 'Authentication failed. Token may have expired — try reconnecting your NinjaOne OAuth2 credential in the Credentials menu.',
			});
		}

		if (err.response?.status === 403) {
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: 'Access denied. Check your API scope permissions.',
			});
		}

		if (err.response?.status === 404) {
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: 'Resource not found.',
			});
		}

		// Rate limit handling with exponential backoff
		if (err.response?.status === 429) {
			if (retryCount < MAX_RETRIES) {
				const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
				await sleep(delay);
				return ninjaOneApiRequest.call(this, method, endpoint, body, qs, retryCount + 1);
			}
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: `Rate limit exceeded after ${MAX_RETRIES} retries. Please wait before retrying.`,
			});
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function ninjaOneApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	propertyName?: string,
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let cursor: string | undefined;
	let lastId: number | string | undefined;

	qs.pageSize = qs.pageSize || 100;

	do {
		if (cursor) {
			qs.after = cursor;
		} else if (lastId !== undefined) {
			// Fallback to offset-based pagination using last ID
			qs.after = String(lastId);
		}

		const response = (await ninjaOneApiRequest.call(this, method, endpoint, body, qs)) as
			| IDataObject[]
			| IDataObject;

		if (Array.isArray(response)) {
			returnData.push(...response);

			// For array responses, use last item's ID as cursor
			if (response.length === qs.pageSize && response.length > 0) {
				const lastItem = response[response.length - 1];
				lastId = lastItem.id as number | string;
				cursor = lastId !== undefined ? String(lastId) : undefined;
			} else {
				cursor = undefined;
			}
		} else if (propertyName && response[propertyName]) {
			const items = response[propertyName] as IDataObject[];
			returnData.push(...items);

			// Use cursor from response if available, otherwise use last item ID
			if (response.cursor) {
				cursor = response.cursor as string;
			} else if (items.length === qs.pageSize && items.length > 0) {
				const lastItem = items[items.length - 1];
				lastId = lastItem.id as number | string;
				cursor = lastId !== undefined ? String(lastId) : undefined;
			} else {
				cursor = undefined;
			}
		} else {
			returnData.push(response);
			cursor = undefined;
		}
	} while (cursor);

	return returnData;
}

/**
 * Extracts and validates the value from a resourceLocator or plain string
 */
export function extractValue(
	value: string | { value: string } | { __rl: boolean; value: string; mode: string } | undefined | null,
): string {
	if (value === undefined || value === null) {
		return '';
	}

	let extracted: string;

	if (typeof value === 'string') {
		extracted = value;
	} else if (typeof value === 'object' && 'value' in value) {
		// value.value could be a number, so convert to string
		extracted = value.value != null ? String(value.value) : '';
	} else {
		extracted = String(value);
	}

	return extracted.trim();
}

/**
 * Extracts value and throws if empty (for required fields)
 */
export function extractRequiredValue(
	value: string | { value: string } | { __rl: boolean; value: string; mode: string } | undefined | null,
	fieldName: string,
): string {
	const extracted = extractValue(value);
	if (!extracted) {
		throw new Error(`${fieldName} is required but was empty or not provided.`);
	}
	return extracted;
}

/**
 * Extracts value and validates it as a valid ID for API paths
 */
export function extractAndValidateId(
	value: string | { value: string } | { __rl: boolean; value: string; mode: string },
	fieldName: string,
): string {
	const extracted = extractValue(value);
	return sanitizeId(extracted, fieldName);
}

/**
 * Parses a comma-separated string of IDs into an array of valid integers
 * Throws an error if no valid IDs are found
 */
export function parseDeviceIds(idsString: string, fieldName: string): number[] {
	if (!idsString || typeof idsString !== 'string') {
		throw new NodeOperationError(
			{ name: 'NinjaOne', type: 'n8n-nodes-ninjaone.ninjaOne', typeVersion: 1 } as never,
			`${fieldName} is required`,
		);
	}

	const ids = idsString
		.split(',')
		.map((id) => {
			const trimmed = id.trim();
			const parsed = parseInt(trimmed, 10);
			return isNaN(parsed) ? null : parsed;
		})
		.filter((id): id is number => id !== null);

	if (ids.length === 0) {
		throw new NodeOperationError(
			{ name: 'NinjaOne', type: 'n8n-nodes-ninjaone.ninjaOne', typeVersion: 1 } as never,
			`No valid device IDs found in ${fieldName}. Expected comma-separated numeric IDs.`,
		);
	}

	return ids;
}
