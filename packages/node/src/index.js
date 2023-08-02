import cors from '@koa/cors';
import Koa from 'koa';
import applyQueryString from 'koa-qs';
import Router from '@koa/router';
import methods from 'methods';
import colors from 'colors';
import ipaddr from 'ipaddr.js';
import getPort from 'get-port';
import axios from 'axios';
import { koaBody } from 'koa-body';
import { exceptHandler, logging, makeResponse, preprocessing } from './handlers.js';
import { createLogger } from './logger.js';
import { DIRECTORY_NAME, DIRECTORY_PORT, PING_DELAY, PING_PATH } from './constants.js';

class Service {
  constructor(name, port, keys) {
    this.name = name;
    this.port = port;
    this.keys = keys;

    this.logger = createLogger(name);
    this.router = new Router();

    for (const method of methods)
      this[method] = (...args) =>
        this.router[method](...args.map((fn) => (typeof fn === 'function' ? fn.bind(this) : fn)));
  }

  async start() {
    if (!this.port) throw new Error('Could not find server port');

    const server = new Koa();

    server.keys = this.keys || [];
    applyQueryString(server);
    server.use(cors());
    server.use(koaBody({ multipart: true }));

    server.use(logging.bind(this));
    server.use(exceptHandler);
    server.use(preprocessing);

    server.use(this.router.routes());
    server.use(this.router.allowedMethods());

    await new Promise((resolve) => {
      this.listener = server.listen(this.port, () => {
        resolve();
        this.logger.info(
          colors.green(
            `Server is ${colors.bold('running')} at ${colors.yellow(
              'http://localhost:' + this.port
            )}`
          )
        );
      });
    });
  }

  async stop() {
    if (this.listener) {
      await this.listener.close();
      this.logger.info(
        colors.red(
          `Server is ${colors.bold('stopped')} at ${colors.yellow('http://localhost:' + this.port)}`
        )
      );
    }
  }

  use(...args) {
    let fnIndex = 0;
    let usePath = '';
    if (typeof args[fnIndex] === 'string') {
      usePath = args[fnIndex];
      fnIndex++;
    }

    for (const fn of args.slice(fnIndex)) {
      if (typeof fn === 'function') this.router.use(usePath, fn.bind(this));

      if (fn instanceof Service)
        this.router.use(usePath, fn.router.routes(), fn.router.allowedMethods());
    }

    return this;
  }
}

export const createService = async (config) => {
  // directory config
  if (config.name && config.directory) {
    config = (await axios.post(config.directory, { name: config.name })).data;
  }

  // local config
  const { port, name, keys } = config;

  // service & server
  const service = new Service(name, port, keys);

  service.get(PING_PATH, async (ctx) => {
    makeResponse(ctx, { body: true });
  });

  return service;
};

export const serveDirectory = async (port = DIRECTORY_PORT) => {
  // create service
  const service = await createService({ name: DIRECTORY_NAME, port });

  // data handlers
  service.currentId = 0;
  service.data = [];

  service.registerService = async function (name, ip = '127.0.0.1') {
    const now = +new Date();

    const info = {
      id: ++this.currentId,
      name: name,
      ip,
      port: await getPort(),
      online: false,
      createdAt: now,
      updatedAt: now
    };

    this.data.push(info);
    return info;
  };

  const directoryInfo = await service.registerService(DIRECTORY_NAME);
  directoryInfo.port = port;
  directoryInfo.updatedAt = +new Date();

  // apis
  service.post('/', async (ctx) => {
    if (!ctx.form.name) return;

    const addr = ipaddr.parse(ctx.request.ip);
    const info = await service.registerService(
      ctx.form.name,
      addr.isIPv4MappedAddress() ? addr.toIPv4Address().toString() : addr.toString()
    );

    makeResponse(ctx, { body: info });
  });

  service.get('/', async (ctx) => {
    makeResponse(ctx, {
      body: ctx.query.name
        ? service.data.filter((info) => info.name === ctx.query.name)
        : service.data
    });
  });

  // ping
  service.timeout = null;
  const ping = async () => {
    for (const item of service.data) {
      try {
        const res = await axios.get(`http://${item.ip}:${item.port}${PING_PATH}`);
        if (!res.data) throw Error('Wrong ping response');
        item.online = true;
      } catch (_) {
        item.online = false;
      }

      item.updatedAt = +new Date();
    }

    service.timeout = setTimeout(ping, PING_DELAY);
  };

  // wrap stop
  service._stop = service.stop;
  service.stop = () => {
    clearTimeout(service.timeout);
    return service._stop();
  };

  // start
  await service.start();
  await ping();

  return service;
};
