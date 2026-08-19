/**
 * Quick test script for Phase 1 WebSocket testing.
 * Run with: pnpm --filter server exec tsx src/test-client.ts
 *
 * This is more reliable than Postman for Socket.IO testing
 * because it listens to all the specific event names.
 */
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

async function test() {
  console.log('=== Unison Phase 1 Test ===\n');

  // Connect Client A
  const clientA = io(SERVER_URL);
  await new Promise<void>((resolve) => clientA.on('connect', () => resolve()));
  console.log('[Client A] Connected:', clientA.id);

  // Listen for all events on Client A
  clientA.onAny((event, ...args) => {
    console.log(`[Client A] ← ${event}:`, JSON.stringify(args[0], null, 2))
  });

  // Connect Client B
  const clientB = io(SERVER_URL);
  await new Promise<void>((resolve) => clientB.on('connect', () => resolve()));
  console.log('[Client B] Connected:', clientB.id);

  clientB.onAny((event, ...args) => {
    console.log(`[Client B] ← ${event}:`, JSON.stringify(args[0], null, 2))
  });

  // Test 1: Client A joins room
  console.log('\n--- Test 1: JOIN ---');
  clientA.emit('JOIN', { roomId: 'test', userId: 'u1', userName: 'Tanish' });
  await sleep(500);

  // Test 2: Client B joins same room
  console.log('\n--- Test 2: Second JOIN ---');
  clientB.emit('JOIN', { roomId: 'test', userId: 'u2', userName: 'Friend' });
  await sleep(500);

  // Test 3: Search YouTube
  console.log('\n--- Test 3: SEARCH ---');
  clientA.emit('SEARCH', { query: 'daft punk', limit: 2 });
  await sleep(2000);

  // Test 4: Add to queue
  console.log('\n--- Test 4: ADD_TO_QUEUE ---');
  clientA.emit('ADD_TO_QUEUE', {
    roomId: 'test',
    track: {
      videoId: 'JGwWNGJdvx8',
      title: 'Ed Sheeran - Shape of You',
      channelName: 'Ed Sheeran',
      thumbnailUrl: 'https://i.ytimg.com/vi/JGwWNGJdvx8/mqdefault.jpg',
      durationMs: 253000,
    },
  });
  await sleep(500);

  // Test 5: Change track (starts SYNC loop)
  console.log('\n--- Test 5: CHANGE_TRACK (expect SYNC every 2s) ---');
  clientA.emit('CHANGE_TRACK', { roomId: 'test', trackId: 'JGwWNGJdvx8' });
  await sleep(5000);

  // Test 6: Pause
  console.log('\n--- Test 6: PAUSE ---');
  clientA.emit('PAUSE', { roomId: 'test', positionMs: 15000 });
  await sleep(2000);

  // Test 7: Seek
  console.log('\n--- Test 7: SEEK ---');
  clientA.emit('SEEK', { roomId: 'test', positionMs: 30000 });
  await sleep(1000);

  // Test 8: Client B leaves
  console.log('\n--- Test 8: LEAVE ---');
  clientB.emit('LEAVE', { roomId: 'test' });
  await sleep(500);

  // Test 9: Client A leaves (room should be deleted)
  console.log('\n--- Test 9: Final LEAVE ---');
  clientA.emit('LEAVE', { roomId: 'test' });
  await sleep(500);

  console.log('\n=== All tests complete ===');
  clientA.disconnect();
  clientB.disconnect();
  process.exit(0);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});