const { Queue } = require('bullmq');

async function clearQueue() {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);

  console.log(`Connecting to Redis at ${host}:${port}...`);
  const queue = new Queue('agent-tasks', {
    connection: { host, port },
  });

  try {
    console.log('Draining queue (removing waiting/paused jobs)...');
    await queue.drain();

    console.log('Cleaning active, completed, failed, delayed, waiting jobs...');
    await queue.clean(0, 1000, 'completed');
    await queue.clean(0, 1000, 'failed');
    await queue.clean(0, 1000, 'active');
    await queue.clean(0, 1000, 'wait');
    await queue.clean(0, 1000, 'delayed');

    console.log('Obliterating queue state...');
    await queue.obliterate({ force: true });

    console.log('SUCCESS: BullMQ queue "agent-tasks" fully cleared and obliterated!');
  } catch (err) {
    console.error('Error clearing queue:', err.message);
  } finally {
    await queue.close();
    process.exit(0);
  }
}

clearQueue();
