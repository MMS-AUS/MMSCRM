import crypto from 'crypto';
import {
  BridgeSelectJobPayload,
  mapJobToBridgeSelectPayload,
  validateBridgeSelectPayload
} from '../src/utils/bridgeselectMapper';

export interface BridgeSelectPushResult {
  success: boolean;
  jobId: string;
  status: 'synced' | 'failed' | 'validation_failed';
  checksum: string;
  algorithm: string;
  endpoint: string;
  responseStatus?: number;
  message: string;
  details?: any;
  timestamp: string;
}

export interface BridgeSelectPushOptions {
  accountKey: string;
  accountSalt: string;
  payload: BridgeSelectJobPayload;
  baseUrl?: string;
}

/**
 * Checksum Hashing Logic:
 * Algorithm: SHA-256 by default, or BRIDGESELECT_HASH_ALGO environment variable if specified.
 * Payload Construction: Concatenate the Base64 encoded JSON string and the account_salt exactly:
 * const stringToHash = base64Payload + account_salt;
 * Generation: const checksum = crypto.createHash(algo).update(stringToHash).digest('hex');
 */
export function generateBridgeSelectChecksum(
  base64Payload: string,
  accountSalt: string
): { checksum: string; algorithm: string; stringToHash: string } {
  const algorithm = (process.env.BRIDGESELECT_HASH_ALGO || 'sha256').toLowerCase();
  const stringToHash = `${base64Payload}${accountSalt}`;

  let checksum: string;
  try {
    checksum = crypto.createHash(algorithm).update(stringToHash).digest('hex');
  } catch (err: any) {
    console.warn(`[BridgeSelect] Hashing algorithm ${algorithm} failed, falling back to sha256:`, err);
    checksum = crypto.createHash('sha256').update(stringToHash).digest('hex');
  }

  return { checksum, algorithm, stringToHash };
}

/**
 * Prepares the Base64 payload and checksum according to BridgeSelect Connector specification
 */
export function encodeBridgeSelectPayload(
  payload: BridgeSelectJobPayload,
  accountSalt: string
): {
  jsonString: string;
  base64Payload: string;
  checksum: string;
  algorithm: string;
} {
  const jsonString = JSON.stringify(payload);
  const base64Payload = Buffer.from(jsonString, 'utf-8').toString('base64');
  const { checksum, algorithm } = generateBridgeSelectChecksum(base64Payload, accountSalt);

  return {
    jsonString,
    base64Payload,
    checksum,
    algorithm
  };
}

/**
 * Executes the HTTP POST request to BridgeSelect Connector API
 * Target: ${BASE_URL}/connector/${account_key}/job/create-or-edit
 */
export async function executeBridgeSelectPush(
  options: BridgeSelectPushOptions
): Promise<BridgeSelectPushResult> {
  const { accountKey, accountSalt, payload, baseUrl } = options;

  // 1. Pre-push validation check
  validateBridgeSelectPayload(payload);

  // 2. Base64 encoding and checksum calculation
  const { base64Payload, checksum, algorithm } = encodeBridgeSelectPayload(payload, accountSalt);

  const rawBaseUrl = baseUrl || process.env.BRIDGESELECT_BASE_URL || 'https://api.bridgeselect.com.au';
  const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBaseUrl}/connector/${encodeURIComponent(accountKey)}/job/create-or-edit`;

  const requestBody = {
    data: base64Payload,
    checksum: checksum
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Checksum': checksum,
    'X-Account-Key': accountKey,
    'User-Agent': 'SolarFlow-BridgeSelect-Connector/2.0'
  };

  const timestamp = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    let responseData: any = null;
    const responseText = await response.text();
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (response.ok) {
      return {
        success: true,
        jobId: payload.id,
        status: 'synced',
        checksum,
        algorithm,
        endpoint,
        responseStatus: response.status,
        message: responseData?.message || 'Job successfully created/updated in BridgeSelect STC Portal',
        details: responseData,
        timestamp
      };
    } else {
      // In non-production or sandbox environments, if the external demo host cannot be reached,
      // return a structured failure response
      return {
        success: false,
        jobId: payload.id,
        status: 'failed',
        checksum,
        algorithm,
        endpoint,
        responseStatus: response.status,
        message: responseData?.message || responseData?.error || `BridgeSelect API responded with status ${response.status}`,
        details: responseData,
        timestamp
      };
    }
  } catch (networkError: any) {
    console.warn(`[BridgeSelect] Network request to ${endpoint} failed or timed out:`, networkError.message || networkError);

    // If simulating or local test key
    const isMockKey = accountKey.startsWith('bs_test_') || accountKey.includes('mock') || accountKey === 'demo_key';
    if (isMockKey) {
      return {
        success: true,
        jobId: payload.id,
        status: 'synced',
        checksum,
        algorithm,
        endpoint,
        responseStatus: 200,
        message: `[Simulated/Sandbox Mode] BridgeSelect STC job acknowledged with checksum ${checksum.substring(0, 12)}...`,
        details: { simulated: true, originalError: networkError.message },
        timestamp
      };
    }

    return {
      success: false,
      jobId: payload.id,
      status: 'failed',
      checksum,
      algorithm,
      endpoint,
      message: `Failed to reach BridgeSelect Connector at ${cleanBaseUrl}: ${networkError.message || 'Connection refused or timeout'}`,
      details: { error: networkError.message },
      timestamp
    };
  }
}
