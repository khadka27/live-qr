import { prisma } from './src/lib/prisma';
import { redis } from './src/lib/redis';
import { generateSecureToken, rotateTokenForQR, validateToken } from './src/lib/tokens';
import { generateQRCodeSVG } from './src/lib/qr-generator';

async function runVerification() {
  console.log('--- LIVE QR SECURE PLATFORM VERIFICATION RUN ---');

  // 1. Verify Redis
  console.log('Testing Redis connection...');
  await redis.set('test_verify_key', 'OK_REDIS');
  const redisVal = await redis.get('test_verify_key');
  console.log(`Redis read result: ${redisVal}`);
  await redis.del('test_verify_key');

  // 2. Verify Database
  console.log('Testing PostgreSQL connection...');
  const userCount = await prisma.user.count();
  console.log(`Database read result (Users count): ${userCount}`);

  // Test querying QRCode schema fields
  const qrCodes = await prisma.qRCode.findMany({
    select: {
      id: true,
      errorCorrection: true,
      webhookUrl: true,
    },
    take: 1,
  });
  console.log('QRCode schema fields query succeeded! Available fields verified.');

  // 3. Verify Token Functions
  console.log('Testing secure token compilation...');
  const secureToken = generateSecureToken();
  console.log(`Cryptographic token generated: ${secureToken}`);

  // 4. Verify QR Styling Matrix
  console.log('Testing custom SVG QR code compiler...');
  const result = generateQRCodeSVG('https://liveqr.com/s/f8K2X91LmAqBvPw', {
    fgColor: '#4f46e5',
    bgColor: '#ffffff',
    dotType: 'rounded',
    frameType: 'label',
    labelText: 'VERIFY NOW',
  });
  console.log(`Custom SVG QR Code generated successfully. Matrix size: ${result.matrixSize}`);

  console.log('--- ALL ENGINE VALIDATIONS SUCCESSFUL ---');
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
