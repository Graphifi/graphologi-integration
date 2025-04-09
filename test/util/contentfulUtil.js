import {
    accessToken,
    getAllConcepts,
    getAllConceptSchemes,
    organizationId,
    toArray
} from "../../service/contentful/taxonomy.js";
import {expect} from "chai";
import {logInfo} from "../../service/loggingUtil.js";

export async function deleteConcept(concept) {
    let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concepts/${concept.sys.id}`;
    logInfo("deleteConcept : "+ endpoint);
    const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: {"Authorization": `Bearer ${accessToken}`, "x-contentful-version": concept.sys.version},
    }).catch(err => {
        logInfo("Delete failed", err)
    });
    if (res.status !== 204) {
        logInfo("Delete failed", res.status, res.json())
    }

}

export async function deleteConceptScheme(csInCF) {
    let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concept-schemes/${csInCF.sys.id}`;
    logInfo("deleteConceptScheme : "+ endpoint);
    const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: {"Authorization": `Bearer ${accessToken}`, "x-contentful-version": csInCF.sys.version},
    }).catch(err => {
        logInfo("Delete failed : "+ err)
    });
    if (204 !== res.status) {
        logInfo("Delete failed "+ res.status +" "+ res.json())
    }
}



export async function deleteAllConcepts(ids) {
    let idsArray = toArray(ids);
    if(idsArray.length === 0) {
        return;
    }
    let concepts = await getAllConcepts();
    for(let i=0;i<concepts.length;i++) {
        let concept = concepts[i];
        if(idsArray.length > 0 && !idsArray.includes(concept.uri)) {
            //skip this concept
        } else {
            await deleteConcept(concept);
        }
    }
}

export async function cleanup(data) {
    let concepts = await getAllConcepts();
    for(let i=0;i<concepts.length;i++) {
        let concept = concepts[i];
        let found = JSON.parse(data).graph.find(it => it.id === concept.uri);
        if(found) {
            await deleteConcept(concept);
        }
    }
    let allCS = await getAllConceptSchemes();
    for(let i=0;i<allCS.length;i++) {
        let cs = allCS[i];
        let found = JSON.parse(data).graph.find(it => it.id === cs.uri);
        if(found) {
            await deleteConceptScheme(cs);
        }
    }
}

export function assertConceptsEqual(contentFulConcept, graphologiConcept) {
    expect(contentFulConcept).not.be.eql(undefined);
    expect(graphologiConcept).not.be.eql(undefined);
    Object.keys(contentFulConcept["prefLabel"]).forEach(l => {
        let k = Object.keys(graphologiConcept["prefLabel"]).find(lk => lk.toLowerCase() === l.toLowerCase());
        expect(contentFulConcept["prefLabel"][l]).to.be.eql(graphologiConcept["prefLabel"][k]);
    })
    if (graphologiConcept['altLabel']) {
        Object.keys(graphologiConcept['altLabel']).forEach(l => {
            if(l.toLowerCase() === "en-US") {
                expect(contentFulConcept["altLabels"]["en-US"]).to.include(graphologiConcept["altLabel"][l]);
            }
        })
    }
    if(graphologiConcept["notation"]) {
        expect(contentFulConcept["notations"].length).to.be.eql(graphologiConcept["notation"].length);
    }
}
