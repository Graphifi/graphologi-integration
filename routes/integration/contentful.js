import express from 'express';
let router = express.Router();

import {syncData} from "../../service/contentful/taxonomy.js"
import {authenticate} from "../../service/authentication.js";


router.put('/taxonomy', authenticate, syncData);

export const integrationRouter = router;
