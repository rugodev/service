# Rugo Service

## Install

```bash
npm i @rugo/service
```

## Usage

```js
import { createService } from '@rugo/service';

const service = await createService({
  /* required */
  name: /* name of service */,

  /* optional */
  port: /* port info*/,
  keys: /* secret keys */,

  /* or */
  directory: /* directory endpoint to get config */
});

// service is a KoaJS's wrapped

await service.start();
await service.stop();
```

## Directory

Service directory is a special service that manage all service config.

```bash
node ./src/directory.js

# or

npm run directory
```

You should set `PORT` in env, if not, `2023` is default.

## Chain

Run many services in a single instance (Microservices -> Monolithic).

```js
const serviceA = createService(/* config */);
const serviceB = createService(/* config */);
const serviceC = createService(/* config */);

serviceA.use(serviceB).use(serviceC);

/* or */
serviceB.use(serviceC);
serviceA.use(serviceB);

/* then */
await serviceA.start();
await serviceA.stop();
```

## License

MIT.
