import { app } from './app';
import { config } from './config';
import { registerAutoResolveTicketWorker } from './queue/autoResolveTicketWorker';
import { startBoss } from './queue/boss';
import { registerClassifyTicketWorker } from './queue/classifyTicketWorker';

async function main() {
  await startBoss();
  await registerClassifyTicketWorker();
  await registerAutoResolveTicketWorker();

  app.listen(config.PORT, () => {
    console.log(`Server listening on port ${config.PORT}`);
  });
}

main();
