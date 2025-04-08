export function handleError(err, req, res, next) {
    if(err) {
        let errorResponse = {
            message: err.message
        };
        if(err.errors) {
            errorResponse.errors = err.errors;
        }
        res.set("Content-Type", "application/json");
        let status = err.status || 500;
        res.status(status).send(errorResponse);
    }
}