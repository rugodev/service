import { createService, serveDirectory } from '../src/index.js';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import { DIRECTORY_NAME, DIRECTORY_PORT } from '../src/constants.js';

chai.use(chaiHttp);

describe('Directory test', function () {
  const directoryAddress = `http://127.0.0.1:${DIRECTORY_PORT}`;
  let service;

  before(async () => {
    service = await serveDirectory();
  });

  after(async () => {
    await service.stop();
  });

  it('should get self info', async () => {
    const res = await chai.request(directoryAddress).get(`/?name=${DIRECTORY_NAME}`);
    expect(res.body).to.has.property('length', 1);
    expect(res.body[0]).to.has.property('id', 1);
    expect(res.body[0]).to.has.property('name', DIRECTORY_NAME);
    expect(res.body[0]).to.has.property('ip', '127.0.0.1');
    expect(res.body[0]).to.has.property('port', DIRECTORY_PORT);
    expect(res.body[0]).to.has.property('online', true);
  });

  it('should register service', async () => {
    const res = await chai.request(directoryAddress).post('/').send({ name: 'alice' });

    expect(res.body).to.has.property('id', 2);
    expect(res.body).to.has.property('name', 'alice');
    expect(res.body).to.has.property('ip', '127.0.0.1');
    expect(res.body).to.has.property('port');
    expect(res.body).to.has.property('createdAt');
    expect(res.body).to.has.property('updatedAt');
  });

  it('should get all info of someone', async () => {
    const res = await chai.request(directoryAddress).get('/?name=alice');
    expect(res.body).to.has.property('length', 1);
  });

  it('should create service from directory', async () => {
    const service = await createService({
      name: 'wally',
      directory: directoryAddress
    });

    await service.start();

    const res = await chai.request(directoryAddress).get('/?name=wally');
    expect(res.body).to.has.property('length', 1);

    await service.stop();
  });
});
