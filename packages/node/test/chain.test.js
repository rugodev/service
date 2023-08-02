import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import Koa from 'koa';
import { createService } from '../src/index.js';
import Router from '@koa/router';

chai.use(chaiHttp);

describe('Service chain', function () {
  it('should router chain', async () => {
    // create server
    const server = new Koa();
    const routes = [];
    for (const name of ['a', 'b', 'c']) {
      routes[name] = new Router();
      routes[name].get('/greet', (ctx) => (ctx.body = `service ${name}`));
      routes[name].get(`/greet-${name}`, (ctx) => (ctx.body = `service ${name}`));
    }

    routes['b'].use(routes['c'].routes());
    routes['a'].use(routes['b'].routes());

    server.use(routes['a'].routes());

    // listen
    let listener;
    await new Promise((resolve) => {
      listener = server.listen(8080, () => {
        resolve();
      });
    });

    // test
    const res = await chai.request('http://localhost:8080').get('/greet');
    expect(res).to.has.property('text', 'service a');
    expect(res).to.has.property('status', 200);

    const res2 = await chai.request('http://localhost:8080').get('/greet-c');
    expect(res2).to.has.property('text', 'service c');
    expect(res2).to.has.property('status', 200);

    // close
    await listener.close();
  });

  it('should chain services', async () => {
    const services = {};

    for (const name of ['a', 'b', 'c']) {
      services[name] = await createService({ name: `service${name.toUpperCase()}`, port: 8080 });
      services[name].get('/greet', function (ctx) {
        this.logger.info(`service ${name}`);
        ctx.resp({ body: `service ${name}` });
      });
      services[name].get(`/greet-${name}`, function (ctx) {
        this.logger.info(`service ${name}`);
        ctx.resp({ body: `service ${name}` });
      });
    }

    services['c'].use('/b', services['b']);
    services['b'].use(services['c']);
    services['a'].use(async function (_, next) {
      this.logger.info('a -> b');
      await next();
    });
    services['a'].use('/children', services['b']);

    await services['a'].start();

    const res = await chai.request('http://localhost:8080').get('/greet');
    expect(res).to.has.property('text', 'service a');
    expect(res).to.has.property('status', 200);

    const res2 = await chai.request('http://localhost:8080').get('/children/greet-c');
    expect(res2).to.has.property('text', 'service c');
    expect(res2).to.has.property('status', 200);

    const res3 = await chai.request('http://localhost:8080').get('/children/b/greet-b');
    expect(res3).to.has.property('text', 'service b');
    expect(res3).to.has.property('status', 200);

    await services['a'].stop();
  });
});
