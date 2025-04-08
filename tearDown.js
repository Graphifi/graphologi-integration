import '@dotenvx/dotenvx/config';
import {getAllConcepts, getAllConceptSchemes} from "./service/contentful/taxonomy.js";
import {deleteConcept, deleteConceptScheme} from "./test/util/contentfulUtil.js";

export async function clearAllData() {
    let concepts = await getAllConcepts();
    for(let i=0;i<concepts.length;i++) {
        let concept = concepts[i];
        await deleteConcept(concept);
    }
    let conceptSchemes = await getAllConceptSchemes();
    for(let i=0;i<conceptSchemes.length;i++) {
        let cs = conceptSchemes[i];
        await deleteConceptScheme(cs);
    }
}

clearAllData().then(() => console.log("All data cleared"));