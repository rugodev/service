import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import { createService } from '../src//index.js';

chai.use(chaiHttp);

describe('Service test', function () {
  let service;

  before(async () => {
    service = createService({
      port: 8080
    });

    service.use(async (_, next) => {
      console.log('something in the middle');
      await next();
    });

    service.get('/something', (ctx) => {
      ctx.body = 'here';
    });

    await service.start();
  });

  after(async () => {
    await service.stop();
  });

  it('should run', async () => {
    const res = await chai.request('http://localhost:8080').get('/something');

    expect(res).to.has.property('status', 200);
    expect(res).to.has.property('text', 'here');
  });
});
