import {isDebugLevel, logDebug, logInfo} from "../loggingUtil.js"

export const accessToken = process.env.CONTENTFUL_ACCESS_TOKEN;
export const organizationId = process.env.CONTENTFUL_ORGANIZATION_ID;
const spaceId = process.env.CONTENTFUL_SPACE_ID;
const environmentId = process.env.CONTENTFUL_ENVIRONMENT_ID;

export const typeConceptScheme = 'ConceptScheme';
export const typeConcept = 'Concept';

const valueTypeLanguageObjectOneStringPerLanguageCode = "valueTypeLanguageObjectOneStringPerLanguageCode";
const valueTypeLanguageObjectOneStringPerLanguageCodeOneLanguageCode = "valueTypeLanguageObjectOneStringPerLanguageCodeOneLanguageCode";
const valueTypeLanguageObjectLanguageValueArray = "valueTypeLanguageObjectLanguageValueArray";
let valueTypeStringArray = "valueTypeStringArray";

const valueType = "valueType";
let languageCodePropertiesMapping = {
    [typeConceptScheme] : {
        "title" : {
            "key" : "prefLabel",
            [valueType] : valueTypeLanguageObjectOneStringPerLanguageCode
        },
        "description" : {
            "key" : "definition",
            "valueType": valueTypeLanguageObjectOneStringPerLanguageCodeOneLanguageCode,
        }
    },
    [typeConcept] : {
        "prefLabel" : {
            "key" : "prefLabel",
            "valueType": valueTypeLanguageObjectOneStringPerLanguageCode,
        },
        "altLabel" : {
            "key" : "altLabels",
            "valueType" : valueTypeLanguageObjectLanguageValueArray
        },
        "hiddenLabel" : {
            "key" : "hiddenLabels",
            [valueType] : valueTypeLanguageObjectLanguageValueArray
        },
        "notation" : {
            "key": "notations",
            [valueType] : valueTypeStringArray
        },
        //TODO: although Contentful API says changeNote is allowed but it is not available on UI
        //Maybe error in API documentation
        //"note" : "note",
        "changeNote" : {
            "key": "note",
            [valueType] : valueTypeLanguageObjectOneStringPerLanguageCodeOneLanguageCode
        },
        "definition" : {
            "key" :"definition",
            [valueType] : valueTypeLanguageObjectOneStringPerLanguageCodeOneLanguageCode
        },
        "editorialNote" : {
            "key" :"editorialNote",
            [valueType] : valueTypeLanguageObjectOneStringPerLanguageCodeOneLanguageCode

        },
        "example" : {
            "key" :"example",
            [valueType] : valueTypeLanguageObjectOneStringPerLanguageCodeOneLanguageCode

        },
        "historyNote" : {
            "key" :"historyNote",
            [valueType] : valueTypeLanguageObjectOneStringPerLanguageCodeOneLanguageCode

        },
        "scopeNote" : {
            "key" : "scopeNote",
            [valueType] : valueTypeLanguageObjectOneStringPerLanguageCodeOneLanguageCode

        },
    }
}


export function toArray(value) {
    if(value !== undefined) {
        if (value.constructor === Array) {
            return value;
        } else {
            return [value]
        }
    } else {
        return []
    }
}

let allDataInContentFull = {};

export async function syncData(req, res, next) {
    logDebug("Start syncData");
    //TODO validate payload before attempting to update
    //There are lots of limitations in Contentful e.g. max count limits, max char counts
    /*
    - uris should be unique
    - notations should be unique - Notation already exists
    - limit on maximum relations 5
    - Check https://www.contentful.com/developers/docs/technical-limits-2025/
        Taxonomy concepts	6,000	Number per organization
        Taxonomy concepts	2,000	Number per scheme
        Taxonomy concepts	10	Number per entry
        Taxonomy schemes	20	Number per organization
    -
     */
    let data = req.body;
    if(isDebugLevel()) {
        logDebug("Data :" + JSON.stringify(data));
    }
    let allLocales = await getAllLocales();
    let conceptSchemesInContentFul = await getAllConceptSchemes();
    let graphData = data.graph;
    let conceptSchemesFromGraphologi = graphData.filter(item => item.type === typeConceptScheme);
    //First create and update data property value only
    //TODO optimise to create for polyhierarchy
    for(let k =0; k < conceptSchemesFromGraphologi.length; k++) {
        let cs = conceptSchemesFromGraphologi[k];
        await createConceptScheme(cs, allLocales);
        //Walk tree and create concept hierarchy first
        let topConceptIds = cs["hasTopConcept"];
        for(let i = 0;i < topConceptIds.length;i++) {
            let tid = topConceptIds[i];
            let graphologiConcept = graphData.find(gd => gd.id === tid);
            await createConcept(graphologiConcept, allLocales);
            await walkAndCreateNarrowerConcepts(cs.id, graphologiConcept, allLocales, graphData);
        }
    }
    //Now that all the resources are there update hierarchy relations
    //Contentful only use broader so we just update that
    for(let k =0; k < conceptSchemesFromGraphologi.length; k++) {
        let cs = conceptSchemesFromGraphologi[k];
        let topConceptIds = cs["hasTopConcept"];
        for(let i = 0;i < topConceptIds.length;i++) {
            let tid = topConceptIds[i];
            let graphologiConcept = graphData.find(gd => gd.id === tid);
            await walkAndAttachNarrowerConcepts(cs.id, graphologiConcept, allLocales, graphData);
        }
    }

    //Now that all the concepts are there update the relations
    let uniquerPairs = {};
    for(let i =0; i < graphData.length; i++) {
        let resource = graphData[i];
        if(resource.type === typeConcept && toArray(resource["related"]).length > 0) {
            toArray(resource["related"]).forEach(r => {
                let idPair = [resource.id, r].sort();
                let key = idPair[0];
                if(uniquerPairs[key] === undefined) {
                    uniquerPairs[key] = [];
                }
                uniquerPairs[key] = [...new Set([...uniquerPairs[key], idPair[1]])];
            })
        }
    }
    let keys = Object.keys(uniquerPairs);
    for(let i =0; i < keys.length; i++) {
        let conceptId = keys[i];
        let relatedIds = uniquerPairs[conceptId];
        await createConceptRelations(conceptId, allLocales, relatedIds);
    }
    //First update concepts list in concept scheme
    await updateConceptsList(graphData);

    //Second Update top concepts list in concept scheme
    //Adding top concepts before adding concept in scheme will fail
    await updateTopConceptsList(graphData);


    //Now delete any left overs

    res.status(200).send("Done");
}

async function walkAndCreateNarrowerConcepts(conceptSchemeId, broaderConceptInGraphologi, allLocales, graphData) {
    let narrowerConceptIds = toArray(broaderConceptInGraphologi['narrower']);
    for (let j = 0; j < narrowerConceptIds.length; j++) {
        let nid = narrowerConceptIds[j];
        let graphologiConcept = graphData.find(gd => gd.id === nid);
        await createConcept(graphologiConcept, allLocales);
        await walkAndCreateNarrowerConcepts(conceptSchemeId, graphologiConcept, allLocales, graphData);
    }
}

export function listsEqual(first, second) {
    if(first.length !== second.length) {
        return false;
    }
    let firstSorted = first.sort();
    let secondSorted = second.sort();
    for (let i = 0; i < firstSorted.length; ++i) {
        if (firstSorted[i] !== secondSorted[i]) {
            return false;
        }
    }
    return true;
}

async function walkAndAttachNarrowerConcepts(conceptSchemeId, broaderConceptInGraphologi, allLocales, graphData) {
    let narrowerConceptIds = toArray(broaderConceptInGraphologi['narrower']);
    for (let j = 0; j < narrowerConceptIds.length; j++) {
        let nid = narrowerConceptIds[j];
        let graphologiConcept = graphData.find(gd => gd.id === nid);
        let conceptInContentful1 = await getConceptFromContentFul(nid);
        let newBroaderConceptsForContentFul = [];
        let broadersArray = graphologiConcept["broader"];
        for(let i=0;i<broadersArray.length;i++) {
            let bid = broadersArray[i];
            let conceptFromCF = await getConceptFromContentFul(bid);
            if(conceptFromCF) {
                newBroaderConceptsForContentFul.push(conceptFromCF);
            }
        }

        let newBroaderConceptsForContentFulIds = newBroaderConceptsForContentFul.map(bc => bc.sys.id);
        let currentBroaderConceptsForContentFulIds = toArray(conceptInContentful1?.["broader"]).map(b => b.sys.id);
        let equal = listsEqual(newBroaderConceptsForContentFulIds, currentBroaderConceptsForContentFulIds);
        if(!equal) {
            //First remove
            let toRemove = currentBroaderConceptsForContentFulIds.map((bid, index) => {
                if(!newBroaderConceptsForContentFulIds.includes(bid)) {
                    return {
                        "op": "remove",
                        "path": `/broader/${index}`
                    }
                }
            }).filter(o => o);
            let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concepts/${conceptInContentful1.sys.id}`;
            if(toRemove.length > 0) {
                await patchToContentful(endpoint, toRemove, conceptInContentful1.sys.version);
            }
            //Now add new
            conceptInContentful1 = await getConceptFromContentFul(nid);
            let addOffset = toArray(conceptInContentful1["broader"]).length;
            let toAdd = newBroaderConceptsForContentFulIds
                .filter(nbid => !currentBroaderConceptsForContentFulIds.includes(nbid))
                .map((nbid, index) => {
                        return {
                            "op": "add",
                            "path": `/broader/${addOffset+index}`,
                            "value": {"sys": {"id": nbid, "linkType": "TaxonomyConcept", "type": "Link"}}
                        }
                })
            if(toAdd.length > 0) {
                await patchToContentful(endpoint, toAdd, conceptInContentful1.sys.version);
            }
        }
        await walkAndAttachNarrowerConcepts(conceptSchemeId, graphologiConcept, allLocales, graphData);
    }
}

async function updateTopConceptsList(graphData) {
    logDebug("updateTopConceptsList");

    let conceptSchemesFromGraphologi = graphData.filter(item => item.type === typeConceptScheme);
    for (let k = 0; k < conceptSchemesFromGraphologi.length; k++) {
        let conceptSchemeFromGraphologi = conceptSchemesFromGraphologi[k];
        let conceptSchemeURI = conceptSchemeFromGraphologi.id;
        let conceptSchemeFromContentFul = await getConceptSchemeFromContentFul(conceptSchemeURI);
        let currentTopConceptsContentfulIds = conceptSchemeFromContentFul["topConcepts"];
        let topConceptIdsFromGraphologiCS = conceptSchemeFromGraphologi["hasTopConcept"];
        let topConceptIdsFromContentfulCS = [];
        for (let i=0;i<currentTopConceptsContentfulIds.length;i++) {
            let cid = currentTopConceptsContentfulIds[i].sys.id;
            let co = await getConceptFromContentFul(undefined, cid);
            topConceptIdsFromContentfulCS.push(co.uri);
        }
        let equal = listsEqual(topConceptIdsFromContentfulCS, topConceptIdsFromGraphologiCS);
        if (!equal) {
            let newTopConceptsForContentFulIds = [];
            for (let i=0;i<topConceptIdsFromGraphologiCS.length;i++) {
                let uri = topConceptIdsFromGraphologiCS[i];
                let co = await getConceptFromContentFul(uri);
                if(co) {
                    newTopConceptsForContentFulIds.push(co.sys.id);
                }
            }
            //First remove
            let toRemove = currentTopConceptsContentfulIds.map((bid, index) => {
                if (!newTopConceptsForContentFulIds.includes(bid)) {
                    return {
                        "op": "remove",
                        "path": `/topConcepts/${index}`
                    }
                }
            }).filter(o => o);
            let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concept-schemes/${conceptSchemeFromContentFul.sys.id}`;
            if(toRemove.length > 0) {
                await patchToContentful(endpoint, toRemove, conceptSchemeFromContentFul.sys.version);
            }
            //Add new
            conceptSchemeFromContentFul = await getConceptSchemeFromContentFul(conceptSchemeURI);
            let addOffset = toArray(conceptSchemeFromContentFul["topConcepts"]).length;
            let toAdd = newTopConceptsForContentFulIds
                .filter(nbid => !currentTopConceptsContentfulIds.includes(nbid))
                .map((nbid, index) => {
                    return {
                        "op": "add",
                        "path": `/topConcepts/${addOffset + index}`,
                        "value": {"sys": {"id": nbid, "linkType": "TaxonomyConcept", "type": "Link"}}
                    }
                }).filter(o => o);
            if(toAdd.length > 0) {
                await patchToContentful(endpoint, toAdd, conceptSchemeFromContentFul.sys.version);
            }
        }

    }
}

async function updateConceptsList(graphData) {
    logDebug("updateConceptsList ")
    let conceptSchemesFromGraphologi = graphData.filter(item => item.type === typeConceptScheme);

    for (let k = 0; k < conceptSchemesFromGraphologi.length; k++) {
        let conceptSchemeFromGraphologi = conceptSchemesFromGraphologi[k];
        let conceptSchemeURI = conceptSchemeFromGraphologi.id;
        let conceptURIsFromGraphologiCS = graphData.filter(co => co.type === typeConcept && toArray(co["inScheme"]).includes(conceptSchemeURI)).map(c => c.id);
        conceptURIsFromGraphologiCS = [...new Set(conceptURIsFromGraphologiCS)];
        //There is chance that concept is in the scheme but is neither top concept nor in hierarchy
        //so we remove those concepts as those are not created in CF
        let conceptURIsFromGraphologiCSWhichAreInCF = [];
        for(let i = 0;i<conceptURIsFromGraphologiCS.length;i++) {
            let uri = conceptURIsFromGraphologiCS[i];
            let concept = await getConceptFromContentFul(uri);
            if(concept) {
                conceptURIsFromGraphologiCSWhichAreInCF.push(uri);
            }
        }
        let conceptSchemeFromContentFul = await getConceptSchemeFromContentFul(conceptSchemeURI);
        let currentConceptsContentfulIds = conceptSchemeFromContentFul["concepts"];
        let conceptURIsFromContentfulCS = [];
        for(let i=0;i<currentConceptsContentfulIds.length;i++) {
            let cid = currentConceptsContentfulIds[i].sys.id;
            let c = await getConceptFromContentFul(undefined, cid);
            if(c) {
                conceptURIsFromContentfulCS.push(c.uri);
            }
        }
        conceptURIsFromContentfulCS = [...new Set(conceptURIsFromContentfulCS)];
        let equal = listsEqual(conceptURIsFromGraphologiCSWhichAreInCF, conceptURIsFromContentfulCS);
        if (!equal) {
            let newConceptsForContentFulIds = [];
            for(let i=0;i<conceptURIsFromGraphologiCSWhichAreInCF.length;i++) {
                let uri = conceptURIsFromGraphologiCSWhichAreInCF[i];
                let c = await getConceptFromContentFul(uri);
                if(c) {
                    newConceptsForContentFulIds.push(c.sys.id);
                } else {
                    logDebug("Ignore : Concept is in scheme but not connected  "+uri)
                }
            }
            //First remove
            let toRemove = currentConceptsContentfulIds.map((bid, index) => {
                if (!newConceptsForContentFulIds.includes(bid)) {
                    return {
                        "op": "remove",
                        "path": `/concepts/${index}`
                    }
                }
            }).filter(o => o);
            let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concept-schemes/${conceptSchemeFromContentFul.sys.id}`;
            if(toRemove.length > 0) {
                await patchToContentful(endpoint, toRemove, conceptSchemeFromContentFul.sys.version);
            }
            //Add new
            conceptSchemeFromContentFul = await getConceptSchemeFromContentFul(conceptSchemeURI);
            let addOffset = toArray(conceptSchemeFromContentFul["concepts"]).length;
            let toAdd = newConceptsForContentFulIds
                .filter(nbid => !currentConceptsContentfulIds.includes(nbid))
                .map((nbid, index) => {
                    return {
                        "op": "add",
                        "path": `/concepts/${addOffset + index}`,
                        "value": {"sys": {"id": nbid, "linkType": "TaxonomyConcept", "type": "Link"}}
                    }
                }).filter(o => o);
            if(toAdd.length > 0) {
                await patchToContentful(endpoint, toAdd, conceptSchemeFromContentFul.sys.version);
            }
        }
    }
}

export async function createConceptScheme(graphologiConceptScheme, locales) {
    let payload = copyDataPropertyValue(typeConceptScheme, graphologiConceptScheme, locales);
    let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concept-schemes`;
    let existingResource = await getConceptSchemeFromContentFul(graphologiConceptScheme.id);
    let changeNeeded = await hasChange(existingResource, payload);
    if(!changeNeeded) {
        return;
    }

    let createResponse = await postToContentful(endpoint, payload);
    if(createResponse.status === 422) {
        if(createResponse.response?.details === "URI already exists") {
            let all = await getAllConceptSchemes();
            let existingConceptScheme = all.find(cs => cs.uri === graphologiConceptScheme.id);
            let putEndpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concept-schemes/${existingConceptScheme.sys.id}`;
            Object.keys(payload).forEach(key => {
                //TODO : optimise to put only if there is a change
                existingConceptScheme[key] = payload[key];
            })
            let putResponse = await putToContentful(putEndpoint, existingConceptScheme, existingConceptScheme.sys.version);
            if(putResponse.status && !isHttpRequestSuccess(putResponse)) {
                throw Error("Put failed");
            }
            return putResponse;
        }
    }
    return createResponse;
}

async function createConceptRelations(conceptId, locales, relatedIds) {
    let patchPayload = [];
    let contentfulConcept = await getConceptFromContentFul(conceptId);
    let contentfulRelatedConcepts = [];
    for(let i=0;i<relatedIds.length;i++) {
        let id = relatedIds[i];
        let concept = await getConceptFromContentFul(id);
        if(concept) {
            contentfulRelatedConcepts.push(concept);
        }
    }
    //TODO optimize for now we remove all old and add all new
    contentfulConcept['related'].forEach((cid, index) => {
        patchPayload.push({
            op: "remove", path: `/related/${index}`
        })
    })
    contentfulRelatedConcepts.forEach((rc, index) => {
        return patchPayload.push({
            "op": "add",
            "path": `/related/${index}`,
            "value": {"sys": {"id": rc.sys.id, "type": "Link"}}
        })
    });
    let latestContentfulConcept = await getConceptFromContentFul(contentfulConcept.uri);
    let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concepts/${latestContentfulConcept.sys.id}`;
    let updatedContentfulConcept = await patchToContentful(endpoint, patchPayload, latestContentfulConcept.sys.version);
    return {
        conceptInContentful : updatedContentfulConcept
    }
}

async function hasChange(existingResource, payload) {
    if(existingResource) {
        let differentKey = Object.keys(payload).find(k => {
            let newValue = JSON.stringify(payload[k]);
            let existingValue = JSON.stringify(existingResource[k]);
            if (newValue !== existingValue) {
                return k;
            }
        });
        if (!differentKey) {
            return false;
        }
    }
    return true;
}

export async function createConcept(graphologiConcept, locales, additionalPropertiesSetter) {
    let payload = copyDataPropertyValue(typeConcept, graphologiConcept, locales);
    if(additionalPropertiesSetter) {
        additionalPropertiesSetter(payload)
    }
    let existingResource = await getConceptFromContentFul(graphologiConcept.id);
    let changeNeeded = await hasChange(existingResource, payload);
    if(!changeNeeded) {
        return;
    }
    let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concepts`;
    let postResult = await postToContentful(endpoint, payload);
    logDebug("Creating status: "+postResult.status + " endpoint :" + endpoint)
    if(postResult.status === 422) {
        if(postResult.response?.details === "URI already exists") {
            let existingConcept = await getConceptFromContentFul(graphologiConcept.id);
            if(!existingConcept) {
                let all = await getAllConcepts();
                existingConcept = all.find(cs => cs.uri === graphologiConcept.id);
            }
            let putEndpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concepts/${existingConcept.sys.id}`;
            Object.keys(payload).forEach(key => {
                //TODO : optimise to put only if there is a change
                existingConcept[key] = payload[key];
            })
            let putResponse = await putToContentful(putEndpoint, existingConcept, existingConcept.sys.version);
            if(putResponse.status && !isHttpRequestSuccess(putResponse)) {
                throw Error("Put for concept failed");
            }
            return putResponse;
        }
    }
    return postResult;
}

export function copyDataPropertyValue(type, graphologiResource, locales) {
    let contentFullPayload = {
        "uri" : graphologiResource.id,
    }
    let languageCodePropertiesMappingElement = languageCodePropertiesMapping[type];
    if(languageCodePropertiesMappingElement) {
        Object.keys(languageCodePropertiesMappingElement).forEach(graphologiKey => {
            let contentfulKey = languageCodePropertiesMappingElement[graphologiKey].key;
            let contentfulValueType = languageCodePropertiesMappingElement[graphologiKey][valueType];
            let graphologiValue = graphologiResource[graphologiKey];
            if (graphologiValue) {
                if(contentfulValueType === valueTypeStringArray) {
                    let graphologiValueArray = toArray(graphologiValue).map(v => {
                        if(v['@value']) {
                           return v['@value'];
                        } else {
                            return v;
                        }
                    });
                    if (graphologiValueArray.length > 0) {
                        if (contentFullPayload[contentfulKey] === undefined) {
                            contentFullPayload[contentfulKey] = {};
                        }
                        //TODO value can be mix of strings and other datatype, convert to array of strings
                        contentFullPayload[contentfulKey] = graphologiValueArray;
                    }
                } else {
                    let graphologiAtValue = graphologiValue["@value"];
                    if(graphologiAtValue) {
                        let languageCode = graphologiValue["language"];
                        graphologiValue = {[languageCode] : graphologiAtValue}
                    }

                    //If for some reason serialisation is language/@value objects array then convert
                    let arrayToCheck = toArray(graphologiValue);
                    let langValueObjs = arrayToCheck.filter(o => o["language"] && o["@value"]);
                    if (arrayToCheck.length > 0 && langValueObjs.length === arrayToCheck.length) {
                        let newObj = {};
                        langValueObjs.forEach(o => {
                            let languageCode = o["language"];
                            if(!newObj[languageCode]) {
                                newObj[languageCode] = o["@value"];
                            } else {
                                let existingValue = toArray(newObj[languageCode]);
                                newObj[languageCode] = [...existingValue, o["@value"]]
                            }
                        })
                        graphologiValue = newObj;
                    }
                    Object.keys(graphologiValue).forEach(langCode => {
                        let found = locales.find(l => l.code.toLowerCase() === langCode.toLowerCase());
                        if (found) {
                            if (contentFullPayload[contentfulKey] === undefined) {
                                contentFullPayload[contentfulKey] = {};
                            }
                            //For some reason contentful allows only one value
                            // ["note", "editorialNote", "historyNote", "scopeNote", "example"]
                            if (valueTypeLanguageObjectOneStringPerLanguageCodeOneLanguageCode === contentfulValueType) {
                                if (contentFullPayload[contentfulKey][found.code] === undefined) {
                                    contentFullPayload[contentfulKey][found.code] = toArray(graphologiValue[langCode])[0];
                                }
                            } else if (valueTypeLanguageObjectLanguageValueArray === contentfulValueType) {
                                // Contentful value should be Array!
                                contentFullPayload[contentfulKey][found.code] = toArray(graphologiValue[langCode]);
                            } else {
                                contentFullPayload[contentfulKey][found.code] = graphologiValue[langCode];
                            }
                        }
                    })
                }
            }
        });
    }
    return contentFullPayload;
}

async function getAllLocales() {
    let pageLink = `https://api.contentful.com/spaces/${spaceId}/environments/${environmentId}/locales`;
    let allPages = await getAllPages(pageLink);
    return allPages;
}

export async function getAllConceptSchemes() {
    let pageLink = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concept-schemes`;
    let allItems = await getAllPages(pageLink);
    allItems.forEach(cs => {
        if(cs.uri) {
            allDataInContentFull[cs.uri] = cs;
        }
    });
    return allItems;
}

export async function getAllConcepts(conceptSchemeId) {
    let pageLink = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concepts?limit=1000`;
    if(conceptSchemeId) {
        pageLink = pageLink + `&conceptScheme=${conceptSchemeId}`;
    }
    const allItems = await getAllPages(pageLink);
    allItems.forEach(it => {
        if(it.uri) {
            allDataInContentFull[it.uri] = it;
        }
    })
    return allItems;
}


async function getConceptFromContentFul(uri, contentFulId) {
    if(uri) {
        let contentFullConcept = allDataInContentFull[uri];
        if (!contentFullConcept) {
            let allConcepts = await getAllConcepts();
            contentFullConcept = allConcepts.find(c => c.uri === uri);
        }
        return contentFullConcept;
    } else if (contentFulId) {
        let found = Object.keys(allDataInContentFull).find(key => allDataInContentFull[key].sys.id === contentFulId);
        if(!found) {
            let allConcepts = await getAllConcepts();
            found = allConcepts.find(c => c.sys.id === contentFulId);
            return found;
        } else {
            return allDataInContentFull[found];
        }
    }
}

async function getConceptSchemeFromContentFul(id) {
    let contentFulData = allDataInContentFull[id];
    if(!contentFulData) {
        let all = await getAllConceptSchemes();
        contentFulData = all.find(c => c.uri ===id);
    }
    return contentFulData;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

let getCounter  = 0 ;
async function getAllPages(pageLink) {
    let allItems = [];
    while (pageLink) {
        logInfo(`${getCounter} getAllPages endpoint : ` + pageLink);
        getCounter = getCounter + 1;

        let request = {
            method: 'GET',
            headers: {"Authorization": `Bearer ${accessToken}`}
        };
        const res = await fetch(pageLink, {...request});
        if (isHttpRequestSuccess(res)) {
            const data = await res.json();
            allItems = [...allItems, ...data.items];
            if (data.pages?.next) {
                pageLink = `https://api.contentful.com${data.pages?.next}`;
            } else {
                pageLink = undefined;
            }
        } else {
            if(res.status === 429) {
                const data = await res.json();
                if(data.sys.id === "RateLimitExceeded") {
                    logDebug("Sleeping .... ");
                    await sleep(2000);
                    logDebug("Awake .... ");
                }
            } else {
                await handleAPICallFailure(pageLink, request, res);
                pageLink = undefined;
            }
        }
    }
    return allItems;
}

let postCounter  = 0 ;
async function postToContentful(endpoint, payload) {
    logInfo(`${postCounter} postToContentful endpoint : ` + endpoint);
    postCounter = postCounter + 1;

    let request = {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/vnd.contentful.management.v1+json"
        },
        body: JSON.stringify(payload)
    };
    const res = await fetch(endpoint, request);
    if (isHttpRequestSuccess(res)) {
        const data = await res.json();
        allDataInContentFull[data.uri] = data;
        return data;
    } else {
        let message = await handleAPICallFailure(endpoint, request, res);
        return message;
    }
}

function isHttpRequestSuccess(res) {
    return res.status > 199 && res.status < 299;
}

let putCounter = 0;
async function putToContentful(endpoint, payload, version) {
    logInfo(`${putCounter} putToContentful endpoint : ` + endpoint);
    putCounter = putCounter + 1;

    let request = {
        method: 'PUT',
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/vnd.contentful.management.v1+json",
            "x-contentful-version" : version
        },
        body: JSON.stringify(payload)
    };
    const res = await fetch(endpoint, request);
    if (isHttpRequestSuccess(res)) {
        const data = await res.json();
        allDataInContentFull[data.uri] = data;
        return data;
    } else {
        let message = await handleAPICallFailure(endpoint, request, res);
        return message;
    }
}

let patchCounter = 0;
async function patchToContentful(endpoint, payload, version) {
    logInfo(`${patchCounter} patchToContentful endpoint : ` + endpoint )
    patchCounter = patchCounter + 1;
    let request = {
        method: 'PATCH',
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json-patch+json",
            "x-contentful-version" : version
        },
        body: JSON.stringify(payload)
    };
    const res = await fetch(endpoint, request);
    if (isHttpRequestSuccess(res)) {
        const data = await res.json();
        allDataInContentFull[data.uri] = data;
        return data;
    } else {
        await handleAPICallFailure(endpoint, request, res);
    }
}

async function handleAPICallFailure(endpoint, request, res ) {
    //TODO add logging
    const data = await res.json();
    request.headers.Authorization = "*****";
    let message = {
        endpoint,
        status : res.status,
        request : request,
        response : data
    };
    logInfo("API call failure", JSON.stringify(message, null, 2));
    return message;
}


