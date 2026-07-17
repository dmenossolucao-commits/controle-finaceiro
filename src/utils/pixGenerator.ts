/**
 * Utility to generate standard Brazilian EMV / BR Code for PIX payments.
 * Based on the official Banco Central do Brasil specification.
 */

export interface PixData {
  key: string;
  name: string;
  city: string;
  amount?: number;
  description?: string;
  transactionId?: string;
}

/**
 * Calculates CRC16 CCITT checksum for the EMV string.
 * Uses polynomial 0x1021 with seed 0xFFFF.
 */
function calculateCRC16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    crc ^= (byte << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = (crc << 1);
      }
      crc &= 0xFFFF;
    }
  }
  let hex = crc.toString(16).toUpperCase();
  while (hex.length < 4) {
    hex = '0' + hex;
  }
  return hex;
}

/**
 * Formats a single EMV field according to ID, Length, and Value.
 */
function formatEMVField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Removes accents and special characters to ensure full bank-app compatibility.
 */
function cleanString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9\s*\-\.\@]/g, '') // Keep alphanumeric, spaces, hyphens, dots, and @ (for emails)
    .toUpperCase();
}

/**
 * Generates the complete "PIX Copia e Cola" EMV string.
 */
export function generatePixCode(data: PixData): string {
  // 1. Payload Format Indicator (ID 00)
  let payload = formatEMVField('00', '01');

  // 2. Merchant Account Information (ID 26)
  const gui = formatEMVField('00', 'br.gov.bcb.pix');
  // Key format clean: remove spaces
  const cleanKey = data.key.trim().replace(/\s+/g, '');
  const key = formatEMVField('01', cleanKey);
  let merchantInfoValue = `${gui}${key}`;
  if (data.description) {
    const cleanDesc = cleanString(data.description).substring(0, 40);
    merchantInfoValue += formatEMVField('02', cleanDesc);
  }
  payload += formatEMVField('26', merchantInfoValue);

  // 3. Merchant Category Code (ID 52)
  payload += formatEMVField('52', '0000');

  // 4. Currency (ID 53) - 986 is BRL
  payload += formatEMVField('53', '986');

  // 5. Amount (ID 54) - format to 2 decimal places
  if (data.amount && data.amount > 0) {
    payload += formatEMVField('54', data.amount.toFixed(2));
  }

  // 6. Country Code (ID 58)
  payload += formatEMVField('58', 'BR');

  // 7. Merchant Name (ID 59)
  const cleanName = cleanString(data.name).substring(0, 25);
  payload += formatEMVField('59', cleanName);

  // 8. Merchant City (ID 60)
  const cleanCity = cleanString(data.city).substring(0, 15);
  payload += formatEMVField('60', cleanCity);

  // 9. Additional Data (ID 62)
  const rawTxId = data.transactionId || 'CON1';
  const txId = cleanString(rawTxId).replace(/[^A-Z0-9]/g, '').substring(0, 25) || 'CON1';
  const additionalDataValue = formatEMVField('05', txId);
  payload += formatEMVField('62', additionalDataValue);

  // 10. CRC16 Checksum (ID 63)
  payload += '6304';
  const checksum = calculateCRC16(payload);
  return `${payload}${checksum}`;
}

/**
 * Downloads a PIX QR Code as a PNG image file.
 */
export async function downloadQrCode(pixCode: string, fileName: string = 'pix-qrcode.png'): Promise<void> {
  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(pixCode)}`;
    const res = await fetch(qrUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error downloading QR Code:', err);
  }
}
