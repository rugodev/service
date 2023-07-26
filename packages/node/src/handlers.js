import colors from 'colors';
import cookie from 'cookie';
import defaultBody from 'http-status';
import { path } from 'ramda';

export function isResponse(data = {}) {
  if (path(['headers', 'location'], data)) {
    return data.status || 307;
  }

  if (data.body && !data.status) {
    return 200;
  }

  return data.status;
}

export function makeResponse(ctx, res) {
  const code = isResponse(res);

  if (!code) {
    return false;
  }

  ctx.status = code;
  ctx.body = res.body || defaultBody[code] || '';
  ctx.set(res.headers || {});

  for (const key in res.cookies) {
    const value = res.cookies[key];

    if (typeof value === 'string') {
      ctx.cookies.set(key, value);
      continue;
    }

    if (typeof value === 'object' && value.value !== undefined) {
      const opts = clone(value);
      delete opts.value;
      ctx.cookies.set(key, value.value, opts);
    }
  }

  return true;
}

export async function logging(ctx, next) {
  ctx.logs = [];

  const ltime = new Date();
  await next();
  const ctime = new Date();

  const msgs = ctx.logs;

  msgs.push(colors.magenta(ctx.method));
  msgs.push(Math.floor(ctx.status / 100) === 2 ? colors.green(ctx.status) : colors.red(ctx.status));
  msgs.push(colors.white(ctx.url));

  const redirectLocation = path(['response', 'header', 'location'], ctx);
  if (redirectLocation) {
    msgs.push(colors.gray(`-> ${redirectLocation}`));
  }

  msgs.push(colors.yellow(`${ctime - ltime}ms`));

  this.logger.http(msgs.join(' '));
}

export async function exceptHandler(ctx, next) {
  try {
    await next();
  } catch (err) {
    if (!err.status) {
      makeResponse(ctx, { status: 500 });
      return console.log(err);
    }

    makeResponse(ctx, { status: err.status, body: { error: err } });
  }
}

export async function preprocessing(ctx, next) {
  // parse cookie
  const cookies = ctx.headers.cookie;

  // form
  const form = ctx.request.body;
  for (const key in ctx.request.files) {
    form[key] = ctx.request.files[key].filepath;
  }
  ctx.form = form;
  ctx.cookies = cookies ? cookie.parse(cookies) : {};

  await next();
}
