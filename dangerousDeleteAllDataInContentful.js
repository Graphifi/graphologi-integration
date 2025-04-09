import '@dotenvx/dotenvx/config';
import {getAllConcepts, getAllConceptSchemes} from "./service/contentful/taxonomy.js";
import {deleteConcept, deleteConceptScheme} from "./test/util/contentfulUtil.js";
import {mapLimit} from "async";

//to run the script set below to true
let run = false;

export async function clearAllData() {
    if(!run) {
        return
    }
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

//Running this will wipe all the Taxonomy data in Contentful
clearAllData().then(() => {
    if(run) {
        console.log("All data cleared")
    } else {
        console.log("************************************")
        console.log("");
        console.log("Not running! To run set run to true.")
        console.log("");
        console.log("************************************")
    }
});