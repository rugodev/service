import cors from '@koa/cors';
import Koa from 'koa';
import applyQueryString from 'koa-qs';
import Router from '@koa/router';
import methods from 'methods';
import { koaBody } from 'koa-body';
import { exceptHandler, logging, preprocessing } from './handlers.js';

export const createService = ({ port, keys }) => {
  if (!port) throw new Error('Could not find server port');

  const service = {};

  const server = new Koa();
  const router = new Router();

  server.keys = keys || [];
  applyQueryString(server);
  server.use(cors());
  server.use(koaBody({ multipart: true }));

  server.use(logging);
  server.use(exceptHandler);
  server.use(preprocessing);

  service.use = (fn) => router.use(fn);
  for (const method of ['use', ...methods]) service[method] = (...args) => router[method](...args);

  service.start = async function () {
    server.use(router.routes());
    server.use(router.allowedMethods());

    await new Promise((resolve) => {
      this.listener = server.listen(port, () => {
        resolve();
      });
    });
  };

  service.stop = async function () {
    if (this.listener) await this.listener.close();
  };

  return service;
};
