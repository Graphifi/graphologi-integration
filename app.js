import '@dotenvx/dotenvx/config';
import {logInfo} from "./service/loggingUtil.js"
import express from 'express';
import path from 'path';
import logger from 'morgan';

import {indexRouter} from './routes/index.js';
import {integrationRouter as contentfulIntegrationRouter} from './routes/integration/contentful.js';

console.log('ENVIRONMENT_FILE : ' + process.env.ENVIRONMENT_FILE);

logInfo('Starting with ENVIRONMENT_FILE : ' + process.env.ENVIRONMENT_FILE);

let expressApp = express();
expressApp.use(express.json( { type :['application/json','application/ld+json'], limit: '50mb'}));
expressApp.use(express.urlencoded({limit: '50mb'}));
expressApp.use(logger('dev'));
expressApp.use(express.json());
expressApp.use(express.urlencoded({ extended: false }));
expressApp.use(express.static(path.join(path.resolve(), 'public')));

expressApp.use('/', indexRouter);
expressApp.use('/integration/contentful', contentfulIntegrationRouter);

export const app = expressApp;
