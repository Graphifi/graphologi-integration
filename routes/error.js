export function handleError(err, req, res, next) {
    if(err) {
        let errorResponse = {
            status: err.status || 500,
            message: err.message
        };
        res.set("Content-Type", "application/json");
        res.status(errorResponse.status).send(errorResponse);
    }
}