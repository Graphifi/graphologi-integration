// Import the dependencies for testing
import { expect } from 'chai';
import chaiModule from "chai";
import chaiHttp  from 'chai-http';

const chai = chaiModule.use(chaiHttp);
import {app} from '../../../app.js';
import fs from 'fs';
import {
    accessToken, copyDataPropertyValue, createConcept, createConceptScheme,
    getAllConcepts,
    getAllConceptSchemes,
    organizationId, toArray, typeConcept, typeConceptScheme
} from '../../../service/contentful/taxonomy.js'

const taxonomyEndpoint = '/integration/contentful/taxonomy';

async function deleteConcept(concept) {
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

async function deleteConceptScheme(cs) {
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

async function deleteAllConceptSchemes() {
    let concepts = await getAllConceptSchemes();
    for(let i=0;i<concepts.length;i++) {
        let cs = concepts[i];
        await deleteConceptScheme(cs);
    }
}

async function deleteAllConcepts() {
    let concepts = await getAllConcepts();
    for(let i=0;i<concepts.length;i++) {
        let concept = concepts[i];
        await deleteConcept(concept);
    }
}

async function cleanup(data) {
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

function assertConceptsEqual(contentFulConcept, graphologiConcept) {
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
        expect(contentFulConcept["notation"].length).to.be.eql(2);
    }
}

describe("Contentful integration", () => {
    beforeEach(async function () {
       // await deleteAllConcepts();
       // await deleteAllConceptSchemes();
    });

    describe("copyDataPropertyValue", () => {
        it('should copy concept properties', async () => {
            let locales = [{"code": "en"}, {"code": "en-US"}];
            let graphologiConcept =     {
                "id": "https://example.com/test1/caac69f6-d814-4f89-8234-1d51b16fbd9e",
                "altLabel": {
                    "en-us": [
                        "Top Concept 1 Alternative Label 1",
                        "Top Concept 1 Alternative Label 2",
                    ],
                    "en" : [
                        "Top Concept 1 Alternative Label 1 en",
                    ]
                },
                "notation": [
                    "Top Concept 1 notation 2",
                    "Top Concept 1 notation 1"
                ],
                "inScheme": [
                    "https://example.com/test1",
                    "https://example.com/test2"
                ],
                "narrower": [
                    "https://example.com/test1/348a2757-92fd-477e-9486-d4cedbacdcc3",
                    "https://example.com/test1/d5203596-0e26-4c8e-a3ae-4f6ea4e3a33c"
                ],
                "prefLabel": {
                    "en-us": "Top Concept 1"
                },
                "relatedMatch": [
                    "https://example.com/test2/9c2b63b5-73a7-4a9e-ba61-e6ae660c676f"
                ],
                "example": {
                    "en-us": [
                        "Top Concept 1 Example 2",
                        "Top Concept 1 Example 1"
                    ]
                },
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
                },
                "created": "2025-03-31T21:14:17.577Z",
                "related": [
                    "https://example.com/test1/af4b02e6-a40c-4117-b8db-d98affe2449c",
                    "https://example.com/test1/049d8726-06d4-44fc-a7a2-e786bc4db0f3"
                ],
                "broader": [
                    "https://example.com/test2/9c2b63b5-73a7-4a9e-ba61-e6ae660c676f"
                ],
                "type": "Concept",
                "definition": {
                    "en-us": "Top Concept 1 Definition 1"
                },
                "revisionNo": 21,
                "topConceptOf": [
                    "https://example.com/test1"
                ],
                "modified": "2025-03-31T21:27:28.981Z"
            }
            let contentFulConcept = copyDataPropertyValue(typeConcept, graphologiConcept, locales);

            expect(contentFulConcept["uri"]).to.be.eql("https://example.com/test1/caac69f6-d814-4f89-8234-1d51b16fbd9e");

            expect(contentFulConcept["prefLabel"]).to.be.eql({"en-US": "Top Concept 1"});

            expect(contentFulConcept["altLabels"]["en-US"]).to.include("Top Concept 1 Alternative Label 1");
            expect(contentFulConcept["altLabels"]["en-US"]).to.include("Top Concept 1 Alternative Label 2");
            expect(contentFulConcept["altLabels"]["en-US"].length).to.be.eql(2);
            expect(contentFulConcept["altLabels"]["en"]).to.include("Top Concept 1 Alternative Label 1 en");
            expect(contentFulConcept["altLabels"]["en"].length).to.be.eql(1);

            expect(contentFulConcept["hiddenLabels"]["en-US"]).to.include("Top Concept 1 Hidden Label 1");
            expect(contentFulConcept["hiddenLabels"]["en-US"].length).to.be.eql(1);

            expect(contentFulConcept["notations"]).to.include("Top Concept 1 notation 2");
            expect(contentFulConcept["notations"]).to.include("Top Concept 1 notation 1");
            expect(contentFulConcept["notations"].length).to.be.eql(2);

            expect(contentFulConcept["note"]).to.be.eql({"en-US": "Top Concept 1 Change Note 1"});
            expect(contentFulConcept["definition"]).to.be.eql({"en-US": "Top Concept 1 Definition 1"});
            expect(contentFulConcept["editorialNote"]).to.be.eql({"en-US": "Top Concept 1 Editorial Note 1"});
            expect(contentFulConcept["example"]).to.be.eql({"en-US": "Top Concept 1 Example 2"});
            expect(contentFulConcept["historyNote"]).to.be.eql({"en-US": "Top Concept 1 History Note 1"});
            expect(contentFulConcept["scopeNote"]).to.be.eql({"en-US": "Top Concept 1 Scope Note 1"});

            expect(Object.keys(contentFulConcept).length).to.be.eql(11);
        })

        it('should copy concept properties when notations has objects', async () => {
            let locales = [{"code": "en"}, {"code": "en-US"}];
            let graphologiConcept = {
                "id": "http://www.wandinc.com/concepts/4585289/Cobra%20Plans",
                "altLabel": {
                    "@value": "Consolidated Omnibus Budget Reconciliation Act Plans",
                    "language": "en-US"
                },
                "hiddenLabel": [
                    {
                        "@value": "hiddenLabel 1",
                        "language": "en-US"
                    },
                    {
                        "@value": "hiddenLabel 2",
                        "language": "en-US"
                    },
                ],
                "broader": [
                    "http://www.wandinc.com/concepts/4585382/Health%20Insurance%20Plans"
                ],
                "notation": [
                    {
                        "@value": "4585289",
                        "type": "http://www.wandinc.com/WANDCode"
                    },
                    "String value"
                ],
                "prefLabel": {
                    "en-US": "Cobra Plans"
                },
                "inScheme": [
                    "http://www.wandinc.com/concepts/General%20Business%20Taxonomy"
                ],
                "type": "Concept"
            }
            let contentFulConcept = copyDataPropertyValue(typeConcept, graphologiConcept, locales);
            expect(contentFulConcept["uri"]).to.be.eql("http://www.wandinc.com/concepts/4585289/Cobra%20Plans");

            expect(contentFulConcept["prefLabel"]).to.be.eql({"en-US": "Cobra Plans"});
            expect(contentFulConcept["altLabels"]["en-US"]).to.include("Consolidated Omnibus Budget Reconciliation Act Plans");
            expect(contentFulConcept["altLabels"]["en-US"].length).to.be.eql(1);
            expect(Object.keys(contentFulConcept).length).to.be.eql(11);

            expect(contentFulConcept["hiddenLabels"]["en-US"]).to.include("hiddenLabel 1");
            expect(contentFulConcept["hiddenLabels"]["en-US"]).to.include("hiddenLabel 2");
            expect(contentFulConcept["hiddenLabels"]["en-US"].length).to.be.eql(2);

            expect(contentFulConcept["notations"]).to.include("4585289");
            expect(contentFulConcept["notations"]).to.include("String value");

        })

        it('should copy concept properties when minimal graphologi concept', async () => {
            let locales = [{"code": "en"}, {"code": "en-US"}];
            let graphologiConcept = {
                "id": "http://www.wandinc.com/concepts/4585289/Cobra%20Plans",
                "prefLabel": {
                    "en-US": "Cobra Plans"
                },
                "type": "Concept"
            }
            let contentFulConcept = copyDataPropertyValue(typeConcept, graphologiConcept, locales);
            expect(contentFulConcept["uri"]).to.be.eql("http://www.wandinc.com/concepts/4585289/Cobra%20Plans");

            expect(contentFulConcept["prefLabel"]).to.be.eql({"en-US": "Cobra Plans"});

            expect(Object.keys(contentFulConcept).length).to.be.eql(2);

        })

        it('should copy concept scheme', async () => {
            let locales = [{"code": "en"}, {"code": "en-US"}];
            let graphologiConceptScheme = {
                "id": "https://example.com/test2",
                "minimiseEncoding": true,
                "created": "2025-04-02T16:59:28.686Z",
                "hasTopConcept": [
                    "https://example.com/test2/Test2TopConcept1",
                    "https://example.com/test2/Test2TopConcept2"
                ],
                "isComponentOf": [
                    "https://grafsync.graphifi.com/data/project/885f9ab1-0553-48a5-803f-f4d1f63688b6"
                ],
                "useSlashIRI": true,
                "useXL": false,
                "title": {
                    "en-us": "Test 2"
                },
                "description": {
                    "en-us": "Test 2 description"
                },
                "useUuidIRI": false,
                "type": "ConceptScheme",
                "iriRemoveSpecialCharacters": true,
                "iriRemoveSpaces": true,
                "modified": "2025-04-02T17:00:20.608Z",
                "revisionNo": 5
            }
            let contentFulConceptScheme = copyDataPropertyValue(typeConceptScheme, graphologiConceptScheme, locales);

            expect(contentFulConceptScheme["uri"]).to.be.eql("https://example.com/test2");

            expect(contentFulConceptScheme["prefLabel"]).to.be.eql({"en-US": "Test 2"});
            expect(contentFulConceptScheme["definition"]).to.be.eql({"en-US": "Test 2 description"});

            expect(Object.keys(contentFulConceptScheme).length).to.be.eql(3);
        })
    })

    describe("createConceptScheme", () => {
        it('should create or update', async () => {
            const conceptSchemeUri = "https://example.com/test1";
            let graphologiConceptScheme = {
                "id": conceptSchemeUri,
                "title": {
                    "en-US": "Airports"
                },
                "description": {
                    "en-us": "Airports description"
                }
            };
            let data = {
                "graph": [graphologiConceptScheme]
            }
            let locales = [{"code": "en"}, {"code": "en-US"}];
            await cleanup(JSON.stringify(data));
            let allConceptSchemes = await getAllConceptSchemes();
            let found = allConceptSchemes.find(cs => cs.uri === conceptSchemeUri);
            expect(found).to.be.eql(undefined);
            await createConceptScheme(graphologiConceptScheme, locales)
            allConceptSchemes = await getAllConceptSchemes();
            found = allConceptSchemes.find(cs => cs.uri === conceptSchemeUri);
            expect(found).not.be.eql(undefined);
            expect(found["prefLabel"]["en-US"]).to.be.eql("Airports");
            expect(found["definition"]["en-US"]).to.be.eql("Airports description");

            //Now update to test update
            let newTitle = 'Airports New Title';
            graphologiConceptScheme["title"]["en-US"] = newTitle;
            await createConceptScheme(graphologiConceptScheme, locales)
            allConceptSchemes = await getAllConceptSchemes();
            found = allConceptSchemes.find(cs => cs.uri === conceptSchemeUri);
            expect(found).not.be.eql(undefined);
            expect(found["prefLabel"]["en-US"]).to.be.eql(newTitle);
            expect(found["definition"]["en-US"]).to.be.eql("Airports description");
        })
    })

    describe("createConcept", () => {
        it('should create or update', async () => {
            const conceptUri = "https://example.com/test1/caac69f6-d814-4f89-8234-1d51b16fbd9e";
            let graphologiConcept =     {
                "id": conceptUri,
                "altLabel": {
                    "en-us": "Top Concept 1 Alternative Label 1"
                },
                "notation": [
                    "Top Concept 1 notation 2 https://example.com/test1/caac69f6-d814-4f89-8234-1d51b16fbd9e",
                    "Top Concept 1 notation 1 https://example.com/test1/caac69f6-d814-4f89-8234-1d51b16fbd9e"
                ],
                "inScheme": [
                    "https://example.com/test1",
                    "https://example.com/test2"
                ],
                "narrower": [
                    "https://example.com/test1/348a2757-92fd-477e-9486-d4cedbacdcc3",
                    "https://example.com/test1/d5203596-0e26-4c8e-a3ae-4f6ea4e3a33c"
                ],
                "prefLabel": {
                    "en-us": "Top Concept 1"
                },
                "relatedMatch": [
                    "https://example.com/test2/9c2b63b5-73a7-4a9e-ba61-e6ae660c676f"
                ],
                "example": {
                    "en-us": [
                        "Top Concept 1 Example 2",
                        "Top Concept 1 Example 1"
                    ]
                },
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
                },
                "created": "2025-03-31T21:14:17.577Z",
                "related": [
                    "https://example.com/test1/af4b02e6-a40c-4117-b8db-d98affe2449c",
                    "https://example.com/test1/049d8726-06d4-44fc-a7a2-e786bc4db0f3"
                ],
                "broader": [
                    "https://example.com/test2/9c2b63b5-73a7-4a9e-ba61-e6ae660c676f"
                ],
                "type": "Concept",
                "definition": {
                    "en-us": "Top Concept 1 Definition 1"
                },
                "revisionNo": 21,
                "topConceptOf": [
                    "https://example.com/test1"
                ],
                "modified": "2025-03-31T21:27:28.981Z"
            };
            let data = {
                "graph": [graphologiConcept]
            }
            let locales = [{"code": "en"}, {"code": "en-US"}];

            await cleanup(JSON.stringify(data));

            let allConcepts = await getAllConcepts();
            let found = allConcepts.find(cs => cs.uri === conceptUri);
            expect(found).to.be.eql(undefined);
            await createConcept(graphologiConcept, locales)
            allConcepts = await getAllConcepts();
            found = allConcepts.find(cs => cs.uri === conceptUri);
            expect(found).not.be.eql(undefined);
            expect(found["prefLabel"]["en-US"]).to.be.eql("Top Concept 1");

            //Now create again and assert update
            let newTitle = "Top Concept 1 New Label";
            graphologiConcept["prefLabel"]["en-US"] = newTitle;
            graphologiConcept["notation"] = [
                "Top Concept 1 notation 2 update https://example.com/test1/caac69f6-d814-4f89-8234-1d51b16fbd9e",
                "Top Concept 1 notation 1 https://example.com/test1/caac69f6-d814-4f89-8234-1d51b16fbd9e"
            ]
            await createConcept(graphologiConcept, locales)
            allConcepts = await getAllConcepts();
            found = allConcepts.find(cs => cs.uri === conceptUri);
            expect(found).not.be.eql(undefined);
            expect(found["prefLabel"]["en-US"]).to.be.eql(newTitle);
            expect(found["notations"].length).to.be.eql(2);
            expect(found["notations"]).to.include("Top Concept 1 notation 1 https://example.com/test1/caac69f6-d814-4f89-8234-1d51b16fbd9e");
            expect(found["notations"]).to.include("Top Concept 1 notation 2 update https://example.com/test1/caac69f6-d814-4f89-8234-1d51b16fbd9e");
        })
    })

    describe(" "+taxonomyEndpoint, () => {
        it("should sync a complex taxonomy", async () => {
            let data = fs.readFileSync("test/routes/integration/go-taxonomy-test1.json", 'utf-8');
            await cleanup(data);
            let allConcepts = await getAllConcepts();
            let concept = allConcepts.find(c => c.uri === "https://example.com/test1/caac69f6-d814-4f89-8234-1d51b16fbd9e");
            expect(concept).to.be.eql(undefined);

            let {res} = await chai.request(app)
                .put(taxonomyEndpoint)
                .set('Content-Type', "application/json")
                .send(data);
            expect(res.statusCode).to.be.eql(200);
            allConcepts = await getAllConcepts();
            concept = allConcepts.find(c => c.uri === "https://example.com/test1/caac69f6-d814-4f89-8234-1d51b16fbd9e");
            expect(concept["prefLabel"]["en-US"]).to.be.eql("Top Concept 1");
            expect(concept["altLabels"]["en-US"][0]).to.be.eql("Top Concept 1 Alternative Label 1");
            expect(concept["hiddenLabels"]["en-US"][0]).to.be.eql("Top Concept 1 Hidden Label 1");
            expect(concept["note"]["en-US"]).to.be.eql("Top Concept 1 Change Note 1");
            expect(concept["definition"]["en-US"]).to.be.eql("Top Concept 1 Definition 1");
            expect(concept["editorialNote"]["en-US"]).to.be.eql("Top Concept 1 Editorial Note 1");
            expect(concept["example"]["en-US"]).to.be.eql("Top Concept 1 Example 2");
            expect(concept["historyNote"]["en-US"]).to.be.eql("Top Concept 1 History Note 1");
            expect(concept["scopeNote"]["en-US"]).to.be.eql("Top Concept 1 Scope Note 1");
            expect(concept["scopeNote"]["en-US"]).to.be.eql("Top Concept 1 Scope Note 1");
            expect(concept["notations"]).to.include("Top Concept 1 notation 1");
            expect(concept["notations"]).to.include("Top Concept 1 notation 2");
            expect(concept["broader"].length).to.be.eql(0);
            expect(concept["related"].length).to.be.eql(2);
            let relatedConceptsURIs = concept["related"].map(rl => rl.sys.id).map(cid => allConcepts.find(c => c.sys.id === cid).uri);
            expect(relatedConceptsURIs).to.include("https://example.com/test1/af4b02e6-a40c-4117-b8db-d98affe2449c");
            expect(relatedConceptsURIs).to.include("https://example.com/test1/049d8726-06d4-44fc-a7a2-e786bc4db0f3");
        });

        it("should sync graphologi project with multiple taxonomies", async () => {
            const data = fs.readFileSync("test/routes/integration/go-taxonomy-project-taxonomy-test1-test2.jsonld", 'utf-8');
            await cleanup(data);
            let allConcepts = await getAllConcepts();
            JSON.parse(data).graph.forEach(r => {
                let id = r.id;
                expect(id).not.be.eql(undefined);
                let concept = allConcepts.find(c => c.uri === id);
                expect(concept).to.be.eql(undefined);
            })
            let {res} = await chai.request(app)
                .put(taxonomyEndpoint)
                .set('Content-Type', "application/json")
                .send(data);
            expect(res.statusCode).to.be.eql(200);
            allConcepts = await getAllConcepts();
            JSON.parse(data).graph.forEach(gr => {
                if(toArray(gr.type).includes(typeConcept)) {
                    let uri = gr.id;
                    let foundConcept = allConcepts.find(ac => ac.uri === uri);
                    assertConceptsEqual(foundConcept, gr);
                }
            })
        });

        it.skip("should sync large taxonomy", async () => {
            const data = fs.readFileSync("test/routes/integration/go-taxonomy-wandinc-general-business-taxonomy.jsonld", 'utf-8');
            //await cleanup(data);
            let allConcepts = await getAllConcepts();
            JSON.parse(data).graph.forEach(r => {
                let id = r.id;
                expect(id).not.be.eql(undefined);
                let concept = allConcepts.find(c => c.uri === id);
               // expect(concept).to.be.eql(undefined);
            })
            let {res} = await chai.request(app)
                .put(taxonomyEndpoint)
                .set('Content-Type', "application/json")
                .send(data);
            expect(res.statusCode).to.be.eql(200);
            allConcepts = await getAllConcepts();
            JSON.parse(data).graph.forEach(gr => {
                if(toArray(gr.type).includes(typeConcept)) {
                    let uri = gr.id;
                    let foundConcept = allConcepts.find(ac => ac.uri === uri);
                    if(foundConcept) {
                        assertConceptsEqual(foundConcept, gr);
                    }
                }
            })
        }).timeout(20 * 60 * 1000);
    });
});