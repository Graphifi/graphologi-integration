import '@dotenvx/dotenvx/config';
import {logInfo} from "./service/loggingUtil.js"
import express from 'express';
import path from 'path';
import logger from 'morgan';

import {indexRouter} from './routes/index.js';
import {integrationRouter as contentfulIntegrationRouter} from './routes/integration/contentful.js';
import {handleError} from "./routes/error.js";

logInfo('ENVIRONMENT_FILE : ' + process.env.ENVIRONMENT_FILE);

logInfo('Starting with ENVIRONMENT_FILE : ' + process.env.ENVIRONMENT_FILE);

let expressApp = express();

expressApp.disable('x-powered-by');
expressApp.set("etag", false);

expressApp.use(express.json( { type :['application/json','application/ld+json'], limit: '50mb'}));
expressApp.use(express.urlencoded({limit: '50mb'}));

expressApp.use(logger('dev'));
expressApp.use(express.static(path.join(path.resolve(), 'public')));

expressApp.use('/', indexRouter);
expressApp.use('/integration/contentful', contentfulIntegrationRouter);

//Add error handler last
expressApp.use(handleError);

export const app = expressApp;
