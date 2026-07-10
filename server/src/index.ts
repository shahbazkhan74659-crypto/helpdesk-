import { app } from './app';
import { config } from './config';
import { startBoss } from './queue/boss';
import { registerClassifyTicketWorker } from './queue/classifyTicketWorker';

async function main() {
  await startBoss();
  await registerClassifyTicketWorker();

  app.listen(config.PORT, () => {
    console.log(`Server listening on port ${config.PORT}`);
  });
}

main();
