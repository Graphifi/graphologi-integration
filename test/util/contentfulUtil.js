import {accessToken, getAllConcepts, getAllConceptSchemes, organizationId} from "../../service/contentful/taxonomy.js";
import {expect} from "chai";

export async function deleteConcept(concept) {
    let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concepts/${concept.sys.id}`;
    console.log("deleteConcept ", endpoint);
    const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: {"Authorization": `Bearer ${accessToken}`, "x-contentful-version": concept.sys.version},
    }).catch(err => {
        console.log("Delete failed", err)
    });
    if (res.status !== 204) {
        console.log("Delete failed", res.status, res.json())
    }
}

export async function deleteConceptScheme(cs) {
    let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concept-schemes/${cs.sys.id}`;
    console.log("deleteConceptScheme ", endpoint);
    const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: {"Authorization": `Bearer ${accessToken}`, "x-contentful-version": cs.sys.version},
    }).catch(err => {
        console.log("Delete failed", err)
    });
    if (204 !== res.status) {
        console.log("Delete failed", res.status, res.json())
    }
}

export async function deleteAllConceptSchemes() {
    let concepts = await getAllConceptSchemes();
    for(let i=0;i<concepts.length;i++) {
        let cs = concepts[i];
        await deleteConceptScheme(cs);
    }
}

export async function deleteAllConcepts() {
    let concepts = await getAllConcepts();
    for(let i=0;i<concepts.length;i++) {
        let concept = concepts[i];
        await deleteConcept(concept);
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
        expect(contentFulConcept["notations"].length).to.be.eql(2);
    }
}
