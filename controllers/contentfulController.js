import {syncData} from "../service/contentful/taxonomy.js";
import {logError} from "../service/loggingUtil.js";

export async function process(req, res, next) {
    try {
        await syncData(req.body);
        res.status(200).send("Done");
        return next();
    } catch (e) {
        logError("Error processing ", e);
        next(e);
    }
}