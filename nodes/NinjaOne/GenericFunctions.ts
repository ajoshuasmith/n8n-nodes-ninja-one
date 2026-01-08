import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { createHash } from 'crypto';

interface TokenCache {
	accessToken: string;
	expiresAt: number;
}

const tokenCache: Map<string, TokenCache> = new Map();

// Maximum retries for rate-limited requests
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Creates a secure cache key that includes a hash of the client secret
 * to prevent token leakage across different credentials with same clientId
 */
function createCacheKey(clientId: string, clientSecret: string, region: string): string {
	const secretHash = createHash('sha256').update(clientSecret).digest('hex').substring(0, 8);
	return `${clientId}-${region}-${secretHash}`;
}

function getBaseUrl(region: string): string {
	switch (region) {
		case 'eu':
			return 'https://eu.ninjarmm.com';
		case 'oc':
			return 'https://oc.ninjarmm.com';
		default:
			return 'https://app.ninjarmm.com';
	}
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
	const credentials = await this.getCredentials('ninjaOneApi');
	const region = credentials.region as string;
	const clientId = credentials.clientId as string;
	const clientSecret = credentials.clientSecret as string;
	const scope = credentials.scope as string;

	// Use secure cache key that includes credential identifier
	const cacheKey = createCacheKey(clientId, clientSecret, region);
	const cached = tokenCache.get(cacheKey);

	if (cached && cached.expiresAt > Date.now()) {
		return cached.accessToken;
	}

	const baseUrl = getBaseUrl(region);
	const tokenUrl = `${baseUrl}/oauth/token`;

	const requestOptions: IHttpRequestOptions = {
		method: 'POST',
		url: tokenUrl,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: clientId,
			client_secret: clientSecret,
			scope: scope,
		}).toString(),
		returnFullResponse: false,
		json: true,
	};

	try {
		const response = (await this.helpers.httpRequest(requestOptions)) as {
			access_token: string;
			expires_in: number;
		};

		// Cache with 60 second buffer before expiry
		const expiresAt = Date.now() + (response.expires_in - 60) * 1000;

		tokenCache.set(cacheKey, {
			accessToken: response.access_token,
			expiresAt,
		});

		return response.access_token;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: 'Failed to obtain access token. Check your Client ID and Client Secret.',
		});
	}
}

export async function ninjaOneApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	retryCount = 0,
): Promise<IDataObject | IDataObject[]> {
	const credentials = await this.getCredentials('ninjaOneApi');
	const region = credentials.region as string;
	const baseUrl = getBaseUrl(region);
	const accessToken = await getAccessToken.call(this);

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		qs,
		json: true,
	};

	if (Object.keys(body).length > 0 && method !== 'GET') {
		options.body = body;
	}

	try {
		const response = await this.helpers.httpRequest(options);
		return response as IDataObject | IDataObject[];
	} catch (error) {
		const err = error as { response?: { status?: number }; message?: string };

		if (err.response?.status === 401) {
			// Clear cached token for this credential
			const clientId = credentials.clientId as string;
			const clientSecret = credentials.clientSecret as string;
			const cacheKey = createCacheKey(clientId, clientSecret, region);
			tokenCache.delete(cacheKey);

			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: 'Authentication failed. Token may have expired.',
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
	value: string | { value: string } | { __rl: boolean; value: string; mode: string },
): string {
	let extracted: string;

	if (typeof value === 'string') {
		extracted = value;
	} else if (value && typeof value === 'object' && 'value' in value) {
		extracted = value.value;
	} else {
		extracted = String(value);
	}

	return extracted.trim();
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
