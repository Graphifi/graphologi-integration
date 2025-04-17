import {isDebugLevel, logDebug, logInfo} from "../loggingUtil.js"
import {mapLimit} from 'async';

export const accessToken = process.env.CONTENTFUL_ACCESS_TOKEN;
export const organizationId = process.env.CONTENTFUL_ORGANIZATION_ID;
const spaceId = process.env.CONTENTFUL_SPACE_ID;
const environmentId = process.env.CONTENTFUL_ENVIRONMENT_ID;

export const typeConceptScheme = 'ConceptScheme';
export const typeConcept = 'Concept';

export const CF_PROP_BROADER = 'broader';
export const GRAPHOLOGI_RPOP_BROADER = 'broader';

export const CF_PROP_RELATED = 'related';
export const GRAPHOLOGI_RPOP_RELATED = 'related';

export const GRAPHOLOGI_RPOP_NOTATION = 'notation';

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

function parallelRequestLimit() {
    return Number(process.env.CONTENTFUL_API_MAX_REQUESTS_IN_PARALLEL) || 2;
}

function maxRetryLimitOnRateLimit() {
    return Number(process.env.CONTENTFUL_API_MAX_RETRIES_ON_RATE_LIMIT_HIT) || 20;
}

function sleepTime() {
    return Number(process.env.CONTENTFUL_API_SLEEP_MILLIS_ON_RATE_LIMIT_HIT) || 1100;
}

export function addConceptToContext(context, concept) {
    if(!concept) {
        return
    }
    let existingConcepts = context['data']['concepts'];
    context['data']['concepts'] = [...existingConcepts.filter(ec => ec.uri !== concept.uri), concept]
}

function removeConceptFromContext(context, concept) {
    let existingConcepts = context['data']['concepts'];
    context['data']['concepts'] = existingConcepts.filter(ec => ec.uri !== concept.uri);
}

function getConceptsFromContext(context) {
    return toArray(context?.['data']?.['concepts']);
}

function getConceptFromContext(context, conceptURI, conceptId) {
    let existingConcepts = getConceptsFromContext(context);
    if(conceptURI) {
        return existingConcepts.find(ec => ec.uri === conceptURI);
    }
    if(conceptId) {
        return existingConcepts.find(ec => ec.sys.id === conceptId);
    }
}

export function addConceptSchemeToContext(context, conceptScheme) {
    if(!conceptScheme) {
        return;
    }
    let existing = getConceptSchemesFromContext(context);
    let rest = existing.filter(ec => ec.uri !== conceptScheme.uri);
    context['data']['conceptSchemes'] = [...rest, conceptScheme]
}

export function getConceptSchemesFromContext(context) {
    return toArray(context['data']['conceptSchemes']);
}

function getConceptSchemesBeforeUpdate(context) {
    return toArray(context['beforeUpdate']['conceptSchemes']);
}

function getConceptSchemeFromContext(context, conceptSchemeURI, conceptSchemeId) {
    let existing = getConceptSchemesFromContext(context);
    if(conceptSchemeURI) {
        return existing.find(ec => ec.uri === conceptSchemeURI);
    }
    if(conceptSchemeId) {
        return existing.find(ec => ec.sys.id === conceptSchemeId);
    }
}

/*
Preconditions
- Graphologi is source of truth for the concept scheme and concepts in payload
- Only one request will be running at time. We do not deal with multiple requests updating CF in parallel.
- Any direct update in Contenful will be overwritten
- No need to store the Contenful ids back in Graphologi
- Data coming from Graphologi is consistent
    - All inverses are materialised, we do not need to deal with scenario like "broader" link
      present but not narrower. Same for related.
    - Full payload which contains all the concept schemes and concepts form those concept schemes.
- For now we assume that all concepts have inScheme property set
- For now we ignore what if a CS is deleted from Graphologi. This can be done manually from Contenful for now.
- TODO There are edge cases that while the update is running it might hit the Contentful limits.
*/
export async function syncData(data) {
    logDebug("Start syncData");
    if(isDebugLevel()) {
        logDebug("Data :" + JSON.stringify(data));
    }
    let allLocales = await getAllLocales();
    let graphData = toArray(data?.graph).filter(d => {
        let typeArray = toArray(d.type);
        return typeArray.includes(typeConcept) || typeArray.includes(typeConceptScheme);
    });
    let context = {
        'locales': allLocales,
        'defaultLocaleCode' : allLocales.find(l => l.default).code,
    };
    let errors = await validate(graphData, context);
    if(errors.length > 0) {
        return errors
    }
    await createNewResources(graphData, context);
    await updateRelated(graphData, context);
    await updateBroader(graphData, context);
    await updateConceptsList(graphData, context);
    //Adding top concepts before adding concept in scheme will fail
    await updateTopConceptsList(graphData, context);
    await deleteLeftOverConcepts(graphData, context);
}

/*
    (Create new resources in Contenful)
    - First fetch all the concept schemes from Contenful and filter those which are in payload
    - For all the concept schemes in payload fetch all the concepts from Contenful
    - If a concept scheme is in payload but not in Contenful, create it with data properties
        (this means we will have cfId)
      else update data properties
    - If a concept is in payload but not in Contenful, create it with data properties
        (this means we will have cfId)
      else update data properties
 */
async function createNewResources(data, context) {
    logInfo('Start createNewResources');
    let localesData = context['locales'];
    let allCSInCF = context['data']['conceptSchemes'];
    let csInPayload = data.filter(c => c.type === typeConceptScheme);
    //let csToAdd = csInPayload.filter(cs => !allCSInCF.find(csInCF => csInCF.uri === cs.id));

    await mapLimit(csInPayload, parallelRequestLimit(), async function(cs) {
        let conceptScheme = await createConceptScheme(cs, localesData);
        addConceptSchemeToContext(context, conceptScheme);
    });

    let allCInCF = context['data']['concepts'];
    let cInPayload = data.filter(c => c.type === typeConcept);
    //let cToAdd = cInPayload.filter(c => !allCInCF.find(cInCF => cInCF.uri === c.id));

    await mapLimit(cInPayload, parallelRequestLimit(), async function(c) {
        let concept = await createConcept(c, localesData, undefined, context);
        addConceptToContext(context, concept);
    })
}

/*
    (
      Update related :
        # Now we have all the new resource in Contenful with cfId.
        # Contenful handles inverse materialisation of related.
        # That is we need to create relation from A to B not B to A
    )
    - For all the concepts in a concept scheme in payload
        - Find unique ordered pairs of related
    - For all the concept in Contenful for the concept scheme
        - Find unique ordered pairs of related
    - From the pairs in payload and pairs in Contenful
        - Find pairs which are not in payload and remove
    - From the pairs in payload and pairs in Contenful
        - Find new pairs and create those

 */
async function updateRelated(data, context) {
    await updateLink(data, context, CF_PROP_RELATED, GRAPHOLOGI_RPOP_RELATED, true);
}

async function updateBroader(data, context) {
    await updateLink(data, context, CF_PROP_BROADER, GRAPHOLOGI_RPOP_BROADER, false);
}

async function updateLink(data, context, linkKeyInCF, linkKeyInPayload, symmetric) {
    logInfo('Start updateLink for ' + linkKeyInCF);
    let conceptsInPayload = data.filter(c => c.type === typeConcept);
    let uniqueRelatedPairsInPayload = {};
    conceptsInPayload.forEach(cInP => {
        let cInPRelated = toArray(cInP[linkKeyInPayload]);
        cInPRelated.forEach(r => {
            let pair = [cInP.id, r];
            addPair(pair, uniqueRelatedPairsInPayload, symmetric);
        })
    });
    let conceptsInCF = context['data']['concepts'];
    let uniqueRelatedPairsInCF = {};
    conceptsInCF.forEach(cInCF => {
        let found = conceptsInPayload.find(cInP => cInP.id === cInCF.uri);
        if(found) {
            let cInCFRelated = toArray(cInCF[linkKeyInCF]).map(r => conceptsInCF.find(c => c.sys.id === r.sys.id));
            cInCFRelated.forEach(r => {
                let pair = [cInCF.uri, r.uri];
                addPair(pair, uniqueRelatedPairsInCF, symmetric);
            })
        }
    })

    let keys = Object.keys(uniqueRelatedPairsInCF);
    for(let i = 0; i < keys.length; i++) {
        let k = keys[i];
        let valueInCF = uniqueRelatedPairsInCF[k];
        let valueInPayload = toArray(uniqueRelatedPairsInPayload[k]);
        let toRemove = valueInCF.filter(v => !valueInPayload.includes(v));
        if(toRemove.length > 0) {
            let co =  conceptsInCF.find(c => c.uri === k);
            let patchPayloadIndexes = toRemove.map(rURI => {
                let cInCFToRemove = conceptsInCF.find(c => c.uri === rURI);
                let index = co.related.findIndex(r => r.sys.id === cInCFToRemove.sys.id);
                return index;
            }).filter(index => index !== -1);

            let sorted = patchPayloadIndexes.sort((a, b) => b - a);
            let patchPayload = sorted.map(index => {
                return {
                    op: 'remove',
                    path: `/${linkKeyInCF}/${index}`
                };
            });
            let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concepts/${co.sys.id}`;
            let concept = await patchToContentful(endpoint, patchPayload, co.sys.version);
            addConceptToContext(context, concept);
        }
    }
    let keysInP = Object.keys(uniqueRelatedPairsInPayload);
    for(let i = 0; i < keysInP.length; i++) {
        let k = keysInP[i];
        let valueInPayload = uniqueRelatedPairsInPayload[k];
        let valueInCF = toArray(uniqueRelatedPairsInCF[k]);
        let toAdd = valueInPayload.filter(v => !valueInCF.includes(v));
        if(toAdd.length > 0) {
            let co =  getConceptFromContext(context, k);
            let startIndex = co[linkKeyInCF].length;
            let patchPayload = toAdd.map((rid, i) => {
                let cInCF = getConceptFromContext(context, rid);// getConceptsFromContext(context).find(c => c.uri === rid);

                let id = cInCF?.sys?.id;
                if(!id) {
                    logInfo("No id for concept with uri " + rid + " in concept scheme with uri " + k + ". Skipping "+linkKeyInCF+" link creation.");
                } else {
                    return {
                        op: 'add',
                        path: `/${linkKeyInCF}/${startIndex + i}`,
                        "value": {"sys": {"id": id, "type": "Link"}}
                    }
                }
            }).filter(p => p);
            if(patchPayload.length > 0) {
                let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concepts/${co.sys.id}`;
                let concept = await patchToContentful(endpoint, patchPayload, co.sys.version);
                addConceptToContext(context, concept);
            }
        }
    }
}


function addPair(pair, collector, symmetric) {
    let sortedPair = symmetric ? pair.sort() : pair;
    if(collector[sortedPair[0]]) {
        let combined = [...collector[sortedPair[0]], sortedPair[1]];
        let uniq = new Set(combined);
        collector[sortedPair[0]] = [...uniq];
    } else {
        collector[sortedPair[0]] = [sortedPair[1]];
    }
}

/*
      Delete leftover Concepts :
        # Now we have all the new resource in Contenful with cfId.
        Note : it is possible that a concept is deleted from a concept scheme,
        but it might be in another concept scheme in Contenful
    - Fetch all concept in CF
    - For each concept find its CSs in CF
    - if payload contains all the CSs of concept
    - if concept is not in payload
    - delete
 */
async function deleteLeftOverConcepts(data, context) {
    logInfo('Start deleteLeftOverConcepts');
    let toDelete = [];
    // Fetch all concept in CF
    let allCInCF = getConceptsFromContext(context);
    // - For each concept
    for (const cCF of allCInCF) {
        //find its CSs in CF
        let cCSsInCF = getConceptSchemesBeforeUpdate(context).filter(cs => {
            let cCFIDs = toArray(cs.concepts).map(co => co.sys.id);
            return cCFIDs.includes(cCF.sys.id)
        });
        // find all the CSs in payload
        let cCSsInPayload = data.filter(c => c.type === typeConceptScheme);

        let inPayload = cCSsInCF.filter(ccs => cCSsInPayload.find(csP => csP.id === ccs.uri));
        let cCSsInCFURIs = cCSsInCF.map(cs => cs.uri);
        let inPayloadURIs = inPayload.map(cs => cs.uri);
        let payloadHasAllCSs = cCSsInCF.length > 0 && listsEqual(cCSsInCFURIs, inPayloadURIs);
        if(payloadHasAllCSs) {
            let cInPayload = data.find(c => c.id === cCF.uri);
            if(!cInPayload) {
                toDelete.push(cCF);
            }
        }
    }
    await mapLimit(toDelete, parallelRequestLimit(), async function(cf) {
        let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concepts/${cf.sys.id}`;
        await deleteToContentful(endpoint, cf.sys.version);
        removeConceptFromContext(context, cf);
    })
}


export function initContext(context, csInCF, cInCF) {
    context["data"] = {};
    context["beforeUpdate"] = {};
    context["data"]["conceptSchemes"] = csInCF || [];
    context["beforeUpdate"]["conceptSchemes"] = csInCF || [];
    context["data"]["concepts"] = cInCF || [];
}

/*
Some limits are from https://www.contentful.com/developers/docs/technical-limits-2025/ and other taken from UI
    Validation
    - check after update no more than 20 concept schemes in Contentful
    - check after update no more than 6000 total concepts in Contenful
    - check concept count in scheme not more than 2000
    - check prefLabel is present in all concepts for the main locale
    - check prefLabel length is not more than 256
    - check uri length is not more than 500
    - check altLabels are not more than 20 for the allowed locales
    - check hiddenLabels are not more than 20 for the allowed locales
    - check notations are not more than 20 for the allowed locales
    - check broader count not more than 5
    - check related count not more than 5
    - check max one value in the main locale for note, changeNote, definition, editorialNote, example, historyNote and scopeNote
 */
export async function validate(data, context) {
    if(data.length === 0) {
        return ["Payload is empty. Nothing to update."];
    }
    let errorsCollector = [];
    let csInCF = await getAllConceptSchemes();
    let cInCF = await getAllConcepts();
    //Prepare context data
    initContext(context, csInCF, cInCF);

    await validateConceptSchemeCounts(data, context, errorsCollector);
    await validateConceptCounts(data, context, errorsCollector);
    await validateConceptCountsInScheme(data, context, errorsCollector);
    await validateResources(data, context, errorsCollector);
    return errorsCollector;
}

/*
   - check after update no more than 20 concept schemes in Contentful
 */
export async function validateConceptSchemeCounts(data, context, errorsCollector) {
    let conceptSchemes = data.filter(c => c['type'] === typeConceptScheme);
    let csLimit = 20;
    let csCount = conceptSchemes.length;
    if (csCount > csLimit) {
        errorsCollector.push(`Maximum ${csLimit} concept scheme allowed in Contentful. Payload contains ${csCount}.`);
    }
    let csInCF = getConceptSchemesFromContext(context);
    let csInCFURIs = csInCF.map(cs => cs.uri);
    let csToAdd = conceptSchemes.filter(cs => !csInCFURIs.includes(cs.id));
    let totalCSinCF = csToAdd.length + csInCF.length;
    if (totalCSinCF > csLimit) {
        errorsCollector.push(`Maximum ${csLimit} concept scheme allowed in Contentful. Payload adds ${csToAdd.length} new concept schemes and there are already ${csInCF.length} concept schemes in Contentful.`);
    }
}

/*
    - check after update no more than 6000 total concepts in Contenful
 */
export async function validateConceptCounts(data, context, errorsCollector) {
    let concepts = data.filter(c => c['type'] === typeConcept);
    let cLimit = 6000;
    let cCount = concepts.length;
    if(cCount > cLimit) {
        errorsCollector.push(`Maximum ${cLimit} concepts allowed in Contentful. Payload has ${cCount} concepts.`);
    }
    let cInCF = context['data']['concepts'];
    let cInCFURIs = cInCF.map(cs => cs.uri);
    let cToAdd = concepts.filter(cs => !cInCFURIs.includes(cs.id));
    let totalCinCF = cToAdd.length + cInCF.length;
    if (totalCinCF > cLimit) {
        errorsCollector.push(`Maximum ${cLimit} concept allowed in Contentful. Payload adds ${cToAdd.length} new concepts and there are ${cInCF.length} concepts in Contentful.`);
    }
}

/*
    - check concept count in scheme not more than 2000
 */
export async function validateConceptCountsInScheme(data, context, errorsCollector) {
    let csInCF = context['data']['conceptSchemes'];
    let csInPayloadURIs = data.filter(c => toArray(c['type']).includes(typeConceptScheme)).map(cs => cs.id);
    const limit = 2000;
    csInPayloadURIs.forEach(csURI => {
        let cPayloadIds = data.filter(c => c['inScheme'] === csURI).map(c => c.id);
        if(cPayloadIds.length > limit) {
            errorsCollector.push(`Maximum ${limit} concepts allowed in a concept scheme. Payload has ${cPayloadIds.length} concepts in concept scheme with URI ${csURI}.`);
        }
    });
}

/*
    - check prefLabel is present in all concepts for the main locale
    - check prefLabel length is not more than 256
    - check uri length is not more than 500
    - check altLabels are not more than 20 for the allowed locales
    - check hiddenLabels are not more than 20 for the allowed locales
    - check notations are not more than 20 for the allowed locales
    - check broader count not more than 5
    - check related count not more than 5
    - check max one value in the main locale for note, changeNote, definition, editorialNote, example, historyNote and scopeNote
 */
export async function validateResources(data, context, errorsCollector) {
    let locales = context['locales'];
    let defaultLocaleCode = context['defaultLocaleCode'];
    const labelCountLimit = 20;
    const linkLimit = 5;
    const uriLengthLimit = 500;

    const prefLabelLengthLimit = 256;
    for (let i = 0; i < data.length; i++) {
        let resource = data[i];
        let cfResource = copyDataPropertyValue(resource, locales);
        if(cfResource.uri?.length > uriLengthLimit) {
            errorsCollector.push(`'uri' for concept with uri '${resource.id}' is too long. Max length is ${uriLengthLimit}.`);
        }
        if (cfResource['prefLabel']?.[defaultLocaleCode] === undefined) {
            errorsCollector.push(`'prefLabel' is missing for concept with uri '${resource.id}' in locale ${defaultLocaleCode}.`);
        }
        if (cfResource['prefLabel']?.[defaultLocaleCode]?.length > prefLabelLengthLimit) {
            errorsCollector.push(`'prefLabel' for concept '${resource.id}' in locale ${defaultLocaleCode} is too long. Max length is ${prefLabelLengthLimit}.`);
        }
        validateLabel('altLabels', cfResource, resource, errorsCollector, labelCountLimit);
        validateLabel('hiddenLabels', cfResource, resource, errorsCollector, labelCountLimit);
        if(toArray(cfResource.notations).length > labelCountLimit) {
            errorsCollector.push(`To many 'notations' for concept with uri '${resource.id}'. Maximum ${labelCountLimit} allowed.`);
        }
        toArray(cfResource.notations).forEach( notation => {
            if (notation.length > 256) {
                errorsCollector.push(`'notations' value '${notation}' for concept with uri '${resource.id}' is too long. Max length is 256.`);
            }
        });
        validateNotationsAreUnique(cfResource, data, context, errorsCollector)

        validateOneLanguageValue('note', cfResource, resource, errorsCollector, defaultLocaleCode);
        validateOneLanguageValue('changeNote', cfResource, resource, errorsCollector, defaultLocaleCode);
        validateOneLanguageValue('definition', cfResource, resource, errorsCollector, defaultLocaleCode);
        validateOneLanguageValue('editorialNote', cfResource, resource, errorsCollector, defaultLocaleCode);
        validateOneLanguageValue('example', cfResource, resource, errorsCollector, defaultLocaleCode);
        validateOneLanguageValue('historyNote', cfResource, resource, errorsCollector, defaultLocaleCode);
        validateOneLanguageValue('scopeNote', cfResource, resource, errorsCollector, defaultLocaleCode);
        if(toArray(resource.broader).length > linkLimit) {
            errorsCollector.push(`To many 'broader' for concept with uri '${resource.id}'. Maximum ${linkLimit} allowed.`);
        }
        if(toArray(resource.related).length > linkLimit) {
            errorsCollector.push(`To many 'related' for concept with uri '${resource.id}'. Maximum ${linkLimit} allowed.`);
        }
    }
}

function validateNotationsAreUnique(cfResource, data, context, errorsCollector) {
    let cInCF = getConceptsFromContext(context).filter(c => c.uri !== cfResource.uri);
    let notationsArray = toArray(cfResource.notations);
    notationsArray.forEach(notation => {
        let notationInCF = cInCF.find(c => c.notations.includes(notation));
        if(notationInCF) {
            let index = cInCF.findIndex(c => c.notations.includes(notation));
            errorsCollector.push(`Notation value '${notation}' for concept with uri '${cfResource.uri}' is already used in concept with uri '${cInCF[index].uri}'.`);
        }
    });
    let cInPayload = data.filter(c => c.id !== cfResource.uri);
    notationsArray.forEach(notation => {
        let notationInPayload = cInPayload.find(c => toStringArrayFromGraphologiValue(c[GRAPHOLOGI_RPOP_NOTATION]).includes(notation));
        if(notationInPayload) {
            errorsCollector.push(`Notation value '${notation}' for concept with uri '${cfResource.uri}' is already used in concept with uri '${notationInPayload.id}'.`);
        }
    });

}

function validateLabel(labelKey, cfResource, resource, errorsCollector, labelCountLimit) {
    let allValues = [];
    let valueObject = cfResource[labelKey];
    if(valueObject) {
        Object.keys(valueObject).forEach(locale => {
            toArray(valueObject[locale]).forEach(v => allValues.push(v));
        })
    }
    if (allValues.length > labelCountLimit) {
        errorsCollector.push(`To many '${labelKey}' for concept with uri '${resource.id}'. Maximum ${labelCountLimit} allowed.`);
    }
    allValues.forEach(l => {
        if (l.length > 256) {
            errorsCollector.push(`'${labelKey}' value '${l}' for concept with uri '${resource.id}' is too long. Max length is 256.`);
        }
    })
}

function validateOneLanguageValue(key, cfResource, resource, errorsCollector, defaultLocaleCode) {
    if (toArray(cfResource[key]?.[defaultLocaleCode]).length > 1) {
        errorsCollector.push(`To many '${key}' for concept with uri '${resource.id}' only ${1} value allowed.`);
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

/*

(
  Update topConcepts :
    # Now we have all the new resource in Contenful with cfId.
    # Contenful stores top concepts in topConcepts list in its CS.
)
- Find all the top concepts in a concept scheme from payload
- Find all the top concept in Contenful for the concept scheme
- From two lists find concepts which are not in payload and remove
- From two lists find concepts which are in payload but not is Contenful list add
 */
async function updateTopConceptsList(graphData, context) {
    logInfo("Start updateTopConceptsList");

    let conceptSchemesFromGraphologi = graphData.filter(item => item.type === typeConceptScheme);
    for (let k = 0; k < conceptSchemesFromGraphologi.length; k++) {
        let conceptSchemeFromGraphologi = conceptSchemesFromGraphologi[k];
        let conceptSchemeURI = conceptSchemeFromGraphologi.id;
        let conceptSchemeFromContentFul = getConceptSchemeFromContext(context, conceptSchemeURI);// await getConceptSchemeFromContentFul(conceptSchemeURI);
        let currentTopConceptsContentfulIds = toArray(conceptSchemeFromContentFul?.["topConcepts"]);
        let topConceptIdsFromGraphologiCS = toArray(conceptSchemeFromGraphologi["hasTopConcept"]);
        let topConceptIdsFromContentfulCS = [];
        for (let i=0;i<currentTopConceptsContentfulIds.length;i++) {
            let cid = currentTopConceptsContentfulIds[i].sys.id;
            let co = getConceptFromContext(context, undefined, cid);// await getConceptFromContentFul(undefined, cid);
            topConceptIdsFromContentfulCS.push(co.uri);
        }
        let equal = listsEqual(topConceptIdsFromContentfulCS, topConceptIdsFromGraphologiCS);
        if (!equal) {
            let newTopConceptsForContentFulIds = [];
            for (let i=0;i<topConceptIdsFromGraphologiCS.length;i++) {
                let uri = topConceptIdsFromGraphologiCS[i];
                let co = getConceptFromContext(context, uri);// await getConceptFromContentFul(uri);
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
            //We remove in reverse order of index otherwise CF remove fails
            toRemove = toRemove.reverse();

            let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concept-schemes/${conceptSchemeFromContentFul.sys.id}`;
            if(toRemove.length > 0) {
                let cs = await patchToContentful(endpoint, toRemove, conceptSchemeFromContentFul.sys.version);
                addConceptSchemeToContext(context, cs);
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
                let cs = await patchToContentful(endpoint, toAdd, conceptSchemeFromContentFul.sys.version);
                addConceptSchemeToContext(context, cs);
            }
        }

    }
}

/*
    (
      Update concepts :
        # Now we have all the new resource in Contenful with cfId.
        # Note: Concepts which are in a CS, Contenful stores it with concepts property in CS.
        # Note : top concepts also needs to be added and we use inScheme property.
    )
    - For all the concepts in a concept scheme from payload
    - For all the concept in Contenful for the concept scheme
    - From two lists find concepts which are not in payload and remove
    - From two lists find concepts which are in payload but not is Contenful list add

 */
async function updateConceptsList(graphData, context) {
    logInfo("Start updateConceptsList ")
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
            let concept = getConceptFromContext(context, uri);// await getConceptFromContentFul(uri);
            if(concept) {
                conceptURIsFromGraphologiCSWhichAreInCF.push(uri);
            }
        }
        let conceptSchemeFromContentFul = getConceptSchemeFromContext(context, conceptSchemeURI);// await getConceptSchemeFromContentFul(conceptSchemeURI);
        let currentConceptsContentfulIds = toArray(conceptSchemeFromContentFul?.["concepts"]);
        let conceptURIsFromContentfulCS = [];

        for(let i=0;i<currentConceptsContentfulIds.length;i++) {
            let cid = currentConceptsContentfulIds[i].sys.id;
            let c = getConceptFromContext(context, undefined, cid);// await getConceptFromContentFul(undefined, cid);
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
                let c = getConceptFromContext(context, uri);
                if(c) {
                    newConceptsForContentFulIds.push(c.sys.id);
                } else {
                    logDebug("Ignore : Concept is in scheme but not connected  "+uri)
                }
            }
            //First remove
            let toRemove = currentConceptsContentfulIds.map((cidObj, index) => {
                let cfId = cidObj.sys.id;
                let existsInNew = newConceptsForContentFulIds.includes(cfId);
                if (!existsInNew) {
                    return {
                        "op": "remove",
                        "path": `/concepts/${index}`
                    }
                }
            })
                .filter(o => o)
                .reverse();
            let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concept-schemes/${conceptSchemeFromContentFul.sys.id}`;
            if(toRemove.length > 0) {
                let res = await patchToContentful(endpoint, toRemove, conceptSchemeFromContentFul.sys.version);
                addConceptSchemeToContext(context, res);
            }
            //Add new
            conceptSchemeFromContentFul = getConceptSchemeFromContext(context, conceptSchemeURI);// await getConceptSchemeFromContentFul(conceptSchemeURI);
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
                let cs = await patchToContentful(endpoint, toAdd, conceptSchemeFromContentFul.sys.version);
                addConceptSchemeToContext(context, cs);
            }
        }
    }
}

export async function createConceptScheme(graphologiConceptScheme, locales) {
    let payload = copyDataPropertyValue(graphologiConceptScheme, locales);
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
        } else {
            throw new Error(createResponse);
        }
    }
    return createResponse;
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

export async function createConcept(graphologiConcept, locales, additionalPropertiesSetter, context ) {
    let conceptURI = graphologiConcept.id;
    logInfo("Creating concept: "+conceptURI);
    let payload = copyDataPropertyValue(graphologiConcept, locales);
    if(additionalPropertiesSetter) {
        additionalPropertiesSetter(payload)
    }
    let existingResource = getConceptFromContext(context, conceptURI);// await getConceptFromContentFul(graphologiConcept.id);
    let changeNeeded = await hasChange(existingResource, payload);
    if(!changeNeeded) {
        return;
    }
    let endpoint = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concepts`;
    let postResult = await postToContentful(endpoint, payload);
    logDebug("Creating status: "+postResult.status + " endpoint :" + endpoint)
    if(postResult.status === 422) {
        if(postResult.response?.details === "URI already exists") {
            let existingConcept = await getConceptFromContentFul(conceptURI);
            if(!existingConcept) {
                let all = await getAllConcepts();
                existingConcept = all.find(cs => cs.uri === conceptURI);
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

export function copyDataPropertyValue(graphologiResource, locales) {
    let type = graphologiResource['type'];
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
                    let stringArray = toStringArrayFromGraphologiValue(graphologiValue);
                    if (stringArray.length > 0) {
                        if (contentFullPayload[contentfulKey] === undefined) {
                            contentFullPayload[contentfulKey] = {};
                        }
                        //TODO value can be mix of strings and other datatype, convert to array of strings
                        contentFullPayload[contentfulKey] = stringArray;
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
                                    let arrayValues = toArray(graphologiValue[langCode]);
                                    if(arrayValues.length === 1) {
                                        contentFullPayload[contentfulKey][found.code] = arrayValues[0];
                                    } else {
                                        //Let validate handle all the errors
                                        contentFullPayload[contentfulKey][found.code] = arrayValues;
                                    }
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

function toStringArrayFromGraphologiValue(graphologiValue) {
    return toArray(graphologiValue).map(v => {
        if(v['@value']) {
            return v['@value'];
        } else {
            return v;
        }
    });
}

async function getAllLocales() {
    let pageLink = `https://api.contentful.com/spaces/${spaceId}/environments/${environmentId}/locales`;
    let allPages = await getAllPages(pageLink);
    return allPages;
}

export async function getAllConceptSchemes() {
    let pageLink = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concept-schemes`;
    let allItems = await getAllPages(pageLink);
    return allItems;
}

export async function getAllConcepts(conceptSchemeId) {
    let pageLink = `https://api.contentful.com/organizations/${organizationId}/taxonomy/concepts?limit=1000`;
    if(conceptSchemeId) {
        pageLink = pageLink + `&conceptScheme=${conceptSchemeId}`;
    }
    const allItems = await getAllPages(pageLink);
    return allItems;
}


async function getConceptFromContentFul(uri, contentFulId) {
    if(uri) {
        let allConcepts = await getAllConcepts();
        let contentFullConcept = allConcepts.find(c => c.uri === uri);
        return contentFullConcept;
    } else if (contentFulId) {
        let allConcepts = await getAllConcepts();
        let found = allConcepts.find(c => c.sys.id === contentFulId);
        return found;
    }
}

async function getConceptSchemeFromContentFul(id) {
    let contentFulData = undefined;
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
        const res = await fetchWithRetry(pageLink, request);
        if (isHttpRequestSuccess(res)) {
            const data = await res.json();
            allItems = [...allItems, ...data.items];
            if (data.pages?.next) {
                pageLink = `https://api.contentful.com${data.pages?.next}`;
            } else {
                pageLink = undefined;
            }
        } else {
            pageLink = undefined;
        }
    }
    return allItems;
}

let postCounter  = 0 ;
async function postToContentful(endpoint, payload) {
    let request = {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/vnd.contentful.management.v1+json"
        },
        body: JSON.stringify(payload)
    };
    let response = await fetchWithRetry(endpoint, request);
    if(isHttpRequestSuccess(response)) {
        return response.json();
    }
    return response;
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
    const res = await fetchWithRetry(endpoint, request);
    if (isHttpRequestSuccess(res)) {
        const data = await res.json();
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
    const res = await fetchWithRetry(endpoint, request);
    if (isHttpRequestSuccess(res)) {
        const data = await res.json();
        return data;
    } else {
        await handleAPICallFailure(endpoint, request, res);
    }
}

let deleteCounter = 0;
async function deleteToContentful(endpoint, version) {
    logInfo(`${deleteCounter} deleteToContentful endpoint : ` + endpoint )
    deleteCounter = deleteCounter + 1;
    let request = {
        method: 'DELETE',
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "x-contentful-version" : version
        }
    };
    const res = await fetchWithRetry(endpoint, request);
    if (isHttpRequestSuccess(res)) {
        return [];
    } else {
        await handleAPICallFailure(endpoint, request, res);
    }
}

async function handleAPICallFailure(endpoint, request, res ) {
    const data = await res.json();
    //Prepare data for logging
    request.headers.Authorization = "*****";
    if(request.body) {
        request.body = JSON.parse(request.body);
    }
    let message = {
        endpoint,
        status : res.status,
        request : request,
        response : data
    };
    logInfo({"error" : "API call failure", data: message});
    return message;
}


async function fetchWithRetry(endpoint, request) {
    let result = undefined;
    let retryCount = 0;
    while (result === undefined && retryCount < maxRetryLimitOnRateLimit()) {
       let result = await fetch(endpoint, request);
        if (isHttpRequestSuccess(result)) {
            return result;
        } else if(result.status === 429) {
            const data = await result.json();
            if(data.sys.id === "RateLimitExceeded") {
                logDebug("RateLimitExceeded Sleeping : " + retryCount);
                await sleep(sleepTime());
                retryCount = retryCount + 1;
                logDebug("RateLimitExceeded Awake : "+retryCount);
            }
        } else {
            let message = await handleAPICallFailure(endpoint, request, result);
            return message;
        }
    }
}

function isHttpRequestSuccess(res) {
    return res.status > 199 && res.status < 299;
}


