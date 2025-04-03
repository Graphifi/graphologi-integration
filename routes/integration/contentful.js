import express from 'express';
let router = express.Router();

import {authenticate} from "../../service/authentication.js";
import {process} from "../../controllers/contentfulController.js";


router.put('/taxonomy', authenticate, process);

export const integrationRouter = router;
