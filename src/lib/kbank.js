const BASE_URL = process.env.KBANK_BASE_URL;
const MERCHANT_ID = '1005';


const SANDBOX = {
  transType: 'K2K', 
  proxyType: '10', 
  proxyValue: '1234567890', 
  toBankCode: '004', 
  fromAccountNo: '1112333000',
  senderName: 'Sandbox',
  senderTaxID: '0001301120098',
  typeOfSender: 'K',
  customerMobileNo: '0991115588',
};


globalThis.kbankTokenCache ??= { token: null, expiresAt: 0 };
const cache = globalThis.kbankTokenCache;

export async function getAccessToken() {
  if (cache.token && Date.now() < cache.expiresAt) {
    return cache.token;
  }


  const basic = Buffer.from(
    `${process.env.KBANK_CONSUMER_ID}:${process.env.KBANK_CONSUMER_SECRET}`
  ).toString('base64');

  const response = await fetch(`${BASE_URL}/v2/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    cache: 'no-store',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`ขอ token KBank ไม่สำเร็จ (${response.status})`);
  }

  const expiresInSec = Number(data.expires_in) || 1800;
  cache.token = data.access_token;
  cache.expiresAt = Date.now() + (expiresInSec - 60) * 1000;
  return cache.token;
}


async function kbankPost(path, body) {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));


  const ok = response.ok && data.responseCode === '0000';
  return { ok, data };
}


function buildMerchantTransID(settlementId) {
  const thaiNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const yyyymmdd = thaiNow.toISOString().slice(0, 10).replace(/-/g, ''); 
  const uniqueId = String(settlementId).padStart(25, '0'); 
  return `${MERCHANT_ID}_${yyyymmdd}_${uniqueId}`;
}


export async function transferFund({ amountSatang, settlementId }) {
  const merchantTransID = buildMerchantTransID(settlementId);

  const verify = await kbankPost('/v1/fundtransfer/verifydata', {
    merchantID: MERCHANT_ID,
    requestDateTime: new Date().toISOString(), 
    transType: SANDBOX.transType,
    merchantTransID,
    proxyType: SANDBOX.proxyType,
    proxyValue: SANDBOX.proxyValue,
    fromAccountNo: SANDBOX.fromAccountNo,
    senderName: SANDBOX.senderName,
    senderTaxID: SANDBOX.senderTaxID,
    toBankCode: SANDBOX.toBankCode,
    amount: (amountSatang / 100).toFixed(2), 
    typeOfSender: SANDBOX.typeOfSender,
  });

  const rsTransID = verify.data.rsTransID ?? null;

  if (!verify.ok || !rsTransID) {
    return { success: false, ref: null, raw: { verify: verify.data } };
  }


  const transfer = await kbankPost('/v1/fundtransfer/fundtransfer', {
    merchantID: MERCHANT_ID,
    requestDateTime: new Date().toISOString(),
    merchantTransID, 
    rsTransID,
    customerMobileNo: SANDBOX.customerMobileNo,
    ref1: `BS${settlementId}`, 
    ref2: '',
  });

  return {
    success: transfer.ok,
    ref: transfer.data.rsTransID ?? null,
    raw: { verify: verify.data, transfer: transfer.data }, 
  };
}
