import {syncData, toArray} from "../service/contentful/taxonomy.js";
import {logError} from "../service/loggingUtil.js";

export async function process(req, res, next) {
    try {
        let errors = await syncData(req.body);
        if(toArray(errors).length > 0) {
            let error = new Error("Request failed with errors.");
            error.status = 400;
            error.errors = errors;
            return next(error);
        }
        res.status(200).send("Success");
        return next();
    } catch (e) {
        logError("Error processing ", e);
        next(e);
    }
}