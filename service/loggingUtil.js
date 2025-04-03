const env = process.env.NODE_ENV || 'development';
const logDir = process.env.LOG_DIRECTORY || "./logs/";
const logConsole = process.env.LOG_CONSOLE === "true";
const logLevel = process.env.LOG_LEVEL || "info";

import fs from "fs";
import winston from 'winston';

import { createLogger, format, transports } from 'winston';

let logger;

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

function setUpLogging() {
    let filename = `${logDir}graphologi-integration.log`;
    console.log("Setting up logger file :" + filename);
    const logFile = new winston.transports.File({
        filename: filename,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m'
    });

    let transportTypes = [
        logFile
    ];

    if (logConsole) {
        transportTypes.push(
            new transports.Console({
                level: logLevel,
                format: format.combine(
                    format.errors({ stack: true }),
                    format.colorize(),
                    format.printf(info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack ? `\n${info.stack}` : ''}`)
                )
            }),
        );
    }

    logger = createLogger({
        level: logLevel,
        format: format.combine(
            format.errors({ stack: true }),
            format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            format.printf(info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack ? `\n${info.stack}` : ''}`)
        ),
        transports: transportTypes
    });

}

export function logDebug(message) {
    logger.debug({ message });
}

export function logInfo(message) {
    logger.info({ message });
}

export function logError(msg, error) {
    let message = msg instanceof Error ?
        msg.message || JSON.stringify(msg, null, 2)
        :
        msg;
    if (error && !(error instanceof Error)) message += "; " + error;
    const stack = msg.stack ?
        msg.stack
        :
        error ?
            error.stack
            :
            null;
    logger.error({
        message,
        stack
    });
}

setUpLogging();


