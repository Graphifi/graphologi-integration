import express from 'express';
let router = express.Router();

import {syncData} from "../../service/contentful/taxonomy.js"


router.put('/taxonomy', syncData);

export const integrationRouter = router;
