import '@dotenvx/dotenvx/config';
import {getAllConcepts, getAllConceptSchemes} from "./service/contentful/taxonomy.js";
import {deleteConcept, deleteConceptScheme} from "./test/util/contentfulUtil.js";
import {mapLimit} from "async";

export async function clearAllData() {
    let concepts = await getAllConcepts();
    let limit = 2;
    await mapLimit(concepts, limit, async (concept) => {
        await deleteConcept(concept);
    });
    let conceptSchemes = await getAllConceptSchemes();
    await mapLimit(conceptSchemes, limit, async (conceptScheme) => {
        await deleteConceptScheme(conceptScheme);
    });
}

clearAllData().then(() => console.log("All data cleared"));