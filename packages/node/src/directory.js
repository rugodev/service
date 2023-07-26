#!/usr/bin/env node

import process from 'node:process';
import { serveDirectory } from './index.js';

serveDirectory(process.env.PORT);
