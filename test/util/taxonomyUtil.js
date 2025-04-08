export function createString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    while (result.length < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export function createTestConcept(cid, prefLabel, altLabel, inScheme, broader, narrower, related , notation, example , hiddenLabel, editorialNote, scopeNote, historyNote, changeNote) {
    let concept = {
        "id": cid,
        "type": "Concept",
        "prefLabel": {
            "en-us": prefLabel
        },
        "altLabel": {
            "en-us": altLabel
        },
        'inScheme': inScheme,
        "narrower": narrower || [],
        "broader": broader || [],
        "related": related || [],
        "notation": notation || [],
        "hiddenLabel": {
            "en-us": "Top Concept 1 Hidden Label 1"
        },
        "editorialNote": {
            "en-us": "Top Concept 1 Editorial Note 1"
        },
        "scopeNote": {
            "en-us": "Top Concept 1 Scope Note 1"
        },
        "historyNote": {
            "en-us": "Top Concept 1 History Note 1"
        },
        "changeNote": {
            "en-us": "Top Concept 1 Change Note 1"
        }
    }
    if(example) {
        concept['example'] = example
    }
    if(hiddenLabel) {
        concept['hiddenLabel'] = hiddenLabel
    }
    if(editorialNote) {
        concept['editorialNote'] = editorialNote
    }
    if(scopeNote) {
        concept['scopeNote'] = scopeNote
    }
    if(historyNote) {
        concept['historyNote'] = historyNote
    }
    if(changeNote) {
        concept['changeNote'] = changeNote
    }
    return concept;
}

export function createTaxonomy(spec) {
    let {depth, conceptCount, baseIRI} = spec;
    let data = [];
    let csId = baseIRI + "/cs";

    function getCid(depthCounter, i) {
        if(depthCounter === 0) {
            return csId + "/depth" + depthCounter + "/c" + i;
        }
        let parent = "";
        for(let j = 0; j < depthCounter; j++) {
            parent += "" + i;
        }
        return csId +"/" +parent+"/depth" + depthCounter + "/c" + i;
    }

    let conceptScheme = {
        "id": csId,
        "type": "ConceptScheme",
        "title": {
            "en-us": "Title " + csId
        },
        "hasTopConcept": []
    }
    data.push(conceptScheme);

    for (let depthCounter = 0; depthCounter < depth; depthCounter++) {
        for (let i = 0; i < conceptCount; i++) {
            let cid = getCid(depthCounter, i);
            let prefLabel = `Concept level ${depthCounter} number ${i}`;

            let concept = createTestConcept(cid, prefLabel, undefined ,conceptScheme.id)
            if(i < conceptCount - 1) {
                let nextSiblingId = getCid(depthCounter, i+1);
                concept["related"].push(nextSiblingId);
            }
            if(i > 0 ) {
                let previousSiblingId = getCid(depthCounter, i - 1);
                concept["related"].push(previousSiblingId);
            }
            if (depthCounter !== depth - 1) {
                for (let j = 0; j < conceptCount; j++) {
                    let nid = getCid(depthCounter+1, j);
                    concept["narrower"].push(nid);
                }
            }
            if (depthCounter > 0) {
                for (let j = 0; j < conceptCount; j++) {
                    let bid = getCid(depthCounter-1, j);
                    concept["broader"].push(bid);
                }
            }
            if (depthCounter === 0) {
                conceptScheme["hasTopConcept"].push(cid);
            }
            data.push(concept);
        }
    }
    return data;
}