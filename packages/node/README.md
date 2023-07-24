# Rugo Service

## Install

```bash
npm i @rugo/service
```

## Usage

```js
import { createService } from '@rugo/service';

const service = createService();

// service is a KoaJS's wrapped

await service.start();
await service.stop();
```

## License

MIT.
