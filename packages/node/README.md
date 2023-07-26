# Rugo Service

## Install

```bash
npm i @rugo/service
```

## Usage

```js
import { createService } from '@rugo/service';

const service = await createService();

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

## License

MIT.
