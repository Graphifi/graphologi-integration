import '@dotenvx/dotenvx/config';
import {
    createConcept,
    createConceptScheme,
    getAllConcepts,
    getAllConceptSchemes,
    syncData,
    toArray,
    typeConceptScheme
} from '../../../service/contentful/taxonomy.js'
import {expect} from "chai";
import {generateKeyPair} from "../../../service/authentication.js";
import {cleanup, deleteAllConcepts} from "../../util/contentfulUtil.js";
import {createTestConcept} from "../../util/taxonomyUtil.js";

describe("Contentful taxonomy integration", () => {

    before(async function () {
        let keyPair = generateKeyPair();
        process.env.GRAPHOLOGI_PUBLIC_KEY = keyPair.publicKey;
        process.env.TEST_GRAPHOLOGI_PRIVATE_KEY = keyPair.privateKey;
    })

    beforeEach(async function () {
    });

    describe("createConceptScheme", () => {
        it('should create or update', async () => {
            const conceptSchemeUri = "https://example.com/test1";
            let graphologiConceptScheme = {
                "id": conceptSchemeUri,
                "type": typeConceptScheme,
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
            let graphologiConcept = {
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
                        "Top Concept 1 Example 2"
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

    describe("test syncData method", () => {
        it('should validate payload', async () => {
            const cs1Id = "https://ex.com/cs/1";
            let conceptScheme = {
                "id" : cs1Id,
                "type" : "ConceptScheme",
            }
            let data = {
                "graph": [conceptScheme]
            }
            let errorsCollector =await syncData(data)
            expect(errorsCollector.length).to.be.eql(1);
            expect(errorsCollector[0]).to.be.eql(`'prefLabel' is missing for concept with uri '${cs1Id}' in locale en-US.`);
        })

        it('should update as changes are made in taxonomy', async () => {
            const cs1Id = "https://ex.com/cs/1";
            const c1Id = "https://ex.com/c/1";
            const c2Id = "https://ex.com/c/2";
            const c3Id = "https://ex.com/c/3";
            const c4Id = "https://ex.com/c/4";
            const c5Id = "https://ex.com/c/5";
            const c6Id = "https://ex.com/c/6";

            let conceptScheme = {
                "id" : cs1Id,
                "type" : "ConceptScheme",
                "title": {
                    "en-us": "CS 1"
                }
            }
            let data = {
                "graph": [conceptScheme]
            }
            await cleanup(JSON.stringify(data));
            await deleteAllConcepts([c1Id, c2Id, c3Id, c4Id, c5Id, c6Id]);
            await syncData(data);

            let allConceptSchemes = await getAllConceptSchemes();
            let foundCS = allConceptSchemes.find(cs => cs.uri === conceptScheme.id);
            expect(foundCS["prefLabel"]["en-US"]).to.be.eql("CS 1");

            //Now add top concept1 and assert
            let concept1 = {
                "id" : c1Id,
                "type" : "Concept",
                "prefLabel": {
                    "en-us": "Top Concept 1"
                },
                'inScheme' : conceptScheme.id
            }
            conceptScheme['hasTopConcept'] = concept1.id;
            data = {
                "graph": [conceptScheme, concept1]
            }
            await syncData(data);

            allConceptSchemes = await getAllConceptSchemes();
            foundCS = allConceptSchemes.find(cs => cs.uri === conceptScheme.id);
            expect(foundCS["prefLabel"]["en-US"]).to.be.eql("CS 1");

            let allConcepts = await getAllConcepts(foundCS.sys.id);
            let foundC1 = allConcepts.find(cs => cs.uri === concept1.id);
            expect(foundC1["prefLabel"]["en-US"]).to.be.eql("Top Concept 1");

            let conceptIdsInCS = toArray(foundCS["concepts"]).map(c => c.sys.id);
            expect(conceptIdsInCS).to.include(foundC1.sys.id);
            expect(conceptIdsInCS.length).to.be.eql(1);

            let topConceptIdsInCS = toArray(foundCS["topConcepts"]).map(c => c.sys.id);
            expect(topConceptIdsInCS).to.include(foundC1.sys.id);
            expect(topConceptIdsInCS.length).to.be.eql(1);

            //Now add one more top concept and assert
            let concept2 = {
                "id" : c2Id,
                "type" : "Concept",
                "prefLabel": {
                    "en-us": "Top Concept 2"
                },
                'inScheme' : conceptScheme.id
            }
            conceptScheme['hasTopConcept'] = [concept1.id, concept2.id];
            data = {
                "graph": [conceptScheme, concept1, concept2]
            }
            await syncData(data);

            allConceptSchemes = await getAllConceptSchemes();
            foundCS = allConceptSchemes.find(cs => cs.uri === conceptScheme.id);
            expect(foundCS["prefLabel"]["en-US"]).to.be.eql("CS 1");

            allConcepts = await getAllConcepts(foundCS.sys.id);
            foundC1 = allConcepts.find(cs => cs.uri === concept1.id);
            expect(foundC1["prefLabel"]["en-US"]).to.be.eql("Top Concept 1");
            let foundC2 = allConcepts.find(cs => cs.uri === concept2.id);
            expect(foundC2["prefLabel"]["en-US"]).to.be.eql("Top Concept 2");

            conceptIdsInCS = toArray(foundCS["concepts"]).map(c => c.sys.id);
            expect(conceptIdsInCS).to.include(foundC1.sys.id);
            expect(conceptIdsInCS).to.include(foundC2.sys.id);
            expect(conceptIdsInCS.length).to.be.eql(2);

            topConceptIdsInCS = toArray(foundCS["topConcepts"]).map(c => c.sys.id);
            expect(topConceptIdsInCS).to.include(foundC1.sys.id);
            expect(topConceptIdsInCS).to.include(foundC2.sys.id);
            expect(topConceptIdsInCS.length).to.be.eql(2);

            //Now add narrower and related
            let concept3 = {
                "id" : c3Id,
                "type" : "Concept",
                "prefLabel": {
                    "en-us": "Concept 3"
                },
                "broader" : [c1Id],
                'inScheme' : conceptScheme.id,
                'related' : [c2Id]
            }
            concept1["narrower"] = [concept3.id];
            data = {
                "graph": [conceptScheme, concept1, concept2, concept3]
            }
            await syncData(data);

            allConceptSchemes = await getAllConceptSchemes();
            foundCS = allConceptSchemes.find(cs => cs.uri === conceptScheme.id);
            expect(foundCS["prefLabel"]["en-US"]).to.be.eql("CS 1");

            allConcepts = await getAllConcepts(foundCS.sys.id);
            foundC1 = allConcepts.find(cs => cs.uri === concept1.id);
            expect(foundC1["prefLabel"]["en-US"]).to.be.eql("Top Concept 1");
            foundC2 = allConcepts.find(cs => cs.uri === concept2.id);
            expect(foundC2["prefLabel"]["en-US"]).to.be.eql("Top Concept 2");

            let foundC3 = allConcepts.find(cs => cs.uri === concept3.id);
            expect(foundC3["prefLabel"]["en-US"]).to.be.eql("Concept 3");
            let broaderIdsInC3 = toArray(foundC3["broader"]).map(c => c.sys.id);
            expect(broaderIdsInC3).to.include(foundC1.sys.id);
            expect(broaderIdsInC3.length).to.be.eql(1);
            let relatedIdsInC3 = toArray(foundC3["related"]).map(c => c.sys.id);
            expect(relatedIdsInC3).to.include(foundC2.sys.id);
            expect(relatedIdsInC3.length).to.be.eql(1);

            conceptIdsInCS = toArray(foundCS["concepts"]).map(c => c.sys.id);
            expect(conceptIdsInCS).to.include(foundC1.sys.id);
            expect(conceptIdsInCS).to.include(foundC2.sys.id);
            expect(conceptIdsInCS).to.include(foundC3.sys.id);
            expect(conceptIdsInCS.length).to.be.eql(3);

            topConceptIdsInCS = toArray(foundCS["topConcepts"]).map(c => c.sys.id);
            expect(topConceptIdsInCS).to.include(foundC1.sys.id);
            expect(topConceptIdsInCS).to.include(foundC2.sys.id);
            expect(topConceptIdsInCS.length).to.be.eql(2);

            //Now add one more narrower and related
            let concept4 = {
                "id" : c4Id,
                "type" : "Concept",
                "prefLabel": {
                    "en-us": "Concept 4"
                },
                "broader" : [c3Id],
                'inScheme' : conceptScheme.id,
                'related' : [c2Id, c1Id]
            }
            concept3["narrower"] = [concept4.id];
            data = {
                "graph": [conceptScheme, concept1, concept2, concept3, concept4]
            }
            await syncData(data);

            allConceptSchemes = await getAllConceptSchemes();
            foundCS = allConceptSchemes.find(cs => cs.uri === conceptScheme.id);
            expect(foundCS["prefLabel"]["en-US"]).to.be.eql("CS 1");

            allConcepts = await getAllConcepts(foundCS.sys.id);
            foundC1 = allConcepts.find(cs => cs.uri === concept1.id);
            expect(foundC1["prefLabel"]["en-US"]).to.be.eql("Top Concept 1");
            foundC2 = allConcepts.find(cs => cs.uri === concept2.id);
            expect(foundC2["prefLabel"]["en-US"]).to.be.eql("Top Concept 2");

            foundC3 = allConcepts.find(cs => cs.uri === concept3.id);
            expect(foundC3["prefLabel"]["en-US"]).to.be.eql("Concept 3");
            broaderIdsInC3 = toArray(foundC3["broader"]).map(c => c.sys.id);
            expect(broaderIdsInC3).to.include(foundC1.sys.id);
            expect(broaderIdsInC3.length).to.be.eql(1);
            relatedIdsInC3 = toArray(foundC3["related"]).map(c => c.sys.id);
            expect(relatedIdsInC3).to.include(foundC2.sys.id);
            expect(relatedIdsInC3.length).to.be.eql(1);

            let foundC4 = allConcepts.find(cs => cs.uri === concept4.id);
            expect(foundC4["prefLabel"]["en-US"]).to.be.eql("Concept 4");
            let broaderIdsInC4 = toArray(foundC4["broader"]).map(c => c.sys.id);
            expect(broaderIdsInC4).to.include(foundC3.sys.id);
            expect(broaderIdsInC4.length).to.be.eql(1);
            let relatedIdsInC4 = toArray(foundC4["related"]).map(c => c.sys.id);
            expect(relatedIdsInC4).to.include(foundC1.sys.id);
            expect(relatedIdsInC4).to.include(foundC2.sys.id);
            expect(relatedIdsInC4.length).to.be.eql(2);

            conceptIdsInCS = toArray(foundCS["concepts"]).map(c => c.sys.id);
            expect(conceptIdsInCS).to.include(foundC1.sys.id);
            expect(conceptIdsInCS).to.include(foundC2.sys.id);
            expect(conceptIdsInCS).to.include(foundC3.sys.id);
            expect(conceptIdsInCS).to.include(foundC4.sys.id);
            expect(conceptIdsInCS.length).to.be.eql(4);

            topConceptIdsInCS = toArray(foundCS["topConcepts"]).map(c => c.sys.id);
            expect(topConceptIdsInCS).to.include(foundC1.sys.id);
            expect(topConceptIdsInCS).to.include(foundC2.sys.id);
            expect(topConceptIdsInCS.length).to.be.eql(2);

            //Now delete top concept 2 and updated c3, c4 related
            conceptScheme['hasTopConcept'] = [concept1.id];
            concept4['related'] = [c1Id];
            concept3['related'] = [];
            data = {
                "graph": [conceptScheme, concept1, concept3, concept4]
            }
            await syncData(data);

            allConceptSchemes = await getAllConceptSchemes();
            foundCS = allConceptSchemes.find(cs => cs.uri === conceptScheme.id);
            expect(foundCS["prefLabel"]["en-US"]).to.be.eql("CS 1");

            allConcepts = await getAllConcepts(foundCS.sys.id);
            foundC1 = allConcepts.find(cs => cs.uri === concept1.id);
            expect(foundC1["prefLabel"]["en-US"]).to.be.eql("Top Concept 1");

            foundC2 = allConcepts.find(cs => cs.uri === concept2.id);
            expect(foundC2).to.be.eql(undefined);

            foundC3 = allConcepts.find(cs => cs.uri === concept3.id);
            foundC4 = allConcepts.find(cs => cs.uri === concept4.id);

            expect(foundC3["prefLabel"]["en-US"]).to.be.eql("Concept 3");
            broaderIdsInC3 = toArray(foundC3["broader"]).map(c => c.sys.id);
            expect(broaderIdsInC3).to.include(foundC1.sys.id);
            expect(broaderIdsInC3.length).to.be.eql(1);
            relatedIdsInC3 = toArray(foundC3["related"]).map(c => c.sys.id);
            expect(relatedIdsInC3.length).to.be.eql(0);

            expect(foundC4["prefLabel"]["en-US"]).to.be.eql("Concept 4");
            broaderIdsInC4 = toArray(foundC4["broader"]).map(c => c.sys.id);
            expect(broaderIdsInC4).to.include(foundC3.sys.id);
            expect(broaderIdsInC4.length).to.be.eql(1);
            relatedIdsInC4 = toArray(foundC4["related"]).map(c => c.sys.id);
            expect(relatedIdsInC4).to.include(foundC1.sys.id);
            expect(relatedIdsInC4.length).to.be.eql(1);

            conceptIdsInCS = toArray(foundCS["concepts"]).map(c => c.sys.id);
            expect(conceptIdsInCS).to.include(foundC1.sys.id);
            expect(conceptIdsInCS).to.include(foundC3.sys.id);
            expect(conceptIdsInCS).to.include(foundC4.sys.id);
            expect(conceptIdsInCS.length).to.be.eql(3);

            topConceptIdsInCS = toArray(foundCS["topConcepts"]).map(c => c.sys.id);
            expect(topConceptIdsInCS).to.include(foundC1.sys.id);
            expect(topConceptIdsInCS.length).to.be.eql(1);

            //Now add two more concept in hierarchy and create related
            let concept5 = {
                "id" : c5Id,
                "type" : "Concept",
                "prefLabel": {
                    "en-us": "Concept 5"
                },
                "narrower" : c6Id,
                'inScheme' : conceptScheme.id
            }
            let concept6 = {
                "id" : c6Id,
                "type" : "Concept",
                "prefLabel": {
                    "en-us": "Concept 6"
                },
                "broader" : [c5Id],
                'inScheme' : conceptScheme.id,
                'related' : [c1Id, c4Id]
            }
            conceptScheme['hasTopConcept'] = [concept1.id, concept5.id];
            data = {
                "graph": [conceptScheme, concept1, concept3, concept4, concept5, concept6]
            }
            await syncData(data);

            allConceptSchemes = await getAllConceptSchemes();
            foundCS = allConceptSchemes.find(cs => cs.uri === conceptScheme.id);
            expect(foundCS["prefLabel"]["en-US"]).to.be.eql("CS 1");

            allConcepts = await getAllConcepts(foundCS.sys.id);
            foundC1 = allConcepts.find(cs => cs.uri === concept1.id);
            foundC3 = allConcepts.find(cs => cs.uri === concept3.id);
            foundC4 = allConcepts.find(cs => cs.uri === concept4.id);

            let foundC5 = allConcepts.find(cs => cs.uri === concept5.id);
            let foundC6 = allConcepts.find(cs => cs.uri === concept6.id);

            let relatedIdsInC6 = toArray(foundC6["related"]).map(c => c.sys.id);
            expect(relatedIdsInC6).to.include(foundC1.sys.id);
            expect(relatedIdsInC6).to.include(foundC4.sys.id);
            expect(relatedIdsInC6.length).to.be.eql(2);

            conceptIdsInCS = toArray(foundCS["concepts"]).map(c => c.sys.id);
            expect(conceptIdsInCS).to.include(foundC1.sys.id);
            expect(conceptIdsInCS).to.include(foundC3.sys.id);
            expect(conceptIdsInCS).to.include(foundC4.sys.id);
            expect(conceptIdsInCS).to.include(foundC5.sys.id);
            expect(conceptIdsInCS).to.include(foundC6.sys.id);
            expect(conceptIdsInCS.length).to.be.eql(5);

            topConceptIdsInCS = toArray(foundCS["topConcepts"]).map(c => c.sys.id);
            expect(topConceptIdsInCS).to.include(foundC1.sys.id);
            expect(topConceptIdsInCS).to.include(foundC5.sys.id);
            expect(topConceptIdsInCS.length).to.be.eql(2);

        })

        it('should delete left over concepts', async function () {
            const cs1Id = "https://ex.com/cs/1";
            const c1Id = "https://ex.com/c/1";
            const c2Id = "https://ex.com/c/2";
            const c3Id = "https://ex.com/c/3";
            const c4Id = "https://ex.com/c/4";
            const c5Id = "https://ex.com/c/5";
            const c6Id = "https://ex.com/c/6";

            let conceptScheme = {
                "id" : cs1Id,
                "type" : "ConceptScheme",
                "title": {
                    "en-us": "CS 1"
                }
            }
            let data = {
                "graph": [conceptScheme, createTestConcept(c1Id, "Concept 1"), createTestConcept(c2Id, "Concept 2"), createTestConcept(c3Id, "Concept 3"), createTestConcept(c4Id, "Concept 4"), createTestConcept(c5Id, "Concept 5"), createTestConcept(c6Id, "Concept 6")]
            }
            await cleanup(JSON.stringify(data));

            let allConcepts = await getAllConcepts();
            let found = allConcepts.find(cs => data.graph.map(r => r.id).includes(cs.uri));
            expect(found).to.be.eql(undefined);

            await syncData(data);

            allConcepts = await getAllConcepts();
            found = allConcepts.filter(cs => data.graph.map(r => r.id).includes(cs.uri)).map(cs => cs.uri);
            expect(found.length).to.be.eql(6);

            data = {
                "graph": [conceptScheme, createTestConcept(c1Id, "Concept 1"), createTestConcept(c2Id, "Concept 2")]
            };

            await syncData(data);

            allConcepts = await getAllConcepts();
            found = allConcepts.filter(cs => data.graph.map(r => r.id).includes(cs.uri)).map(cs => cs.uri);
            expect(found.length).to.be.eql(2);

        })

        it('should not delete data from other concept schemes', async function () {
            const cs1Id = "https://ex.com/cs/1";
            const cs2Id = "https://ex.com/cs/2";
            const c1Id = "https://ex.com/c/1";
            const c2Id = "https://ex.com/c/2";
            const c3Id = "https://ex.com/c/3";
            const c4Id = "https://ex.com/c/4";
            const c5Id = "https://ex.com/c/5";
            const c6Id = "https://ex.com/c/6";
            const c7Id = "https://ex.com/c/7";

            let conceptScheme1 = {
                "id" : cs1Id,
                "type" : "ConceptScheme",
                "title": {
                    "en-us": "CS 1"
                }
            }
            let conceptScheme2 = {
                "id" : cs2Id,
                "type" : "ConceptScheme",
                "title": {
                    "en-us": "CS 2"
                }
            }
            let data = {
                "graph": [
                    conceptScheme1,
                    conceptScheme2,
                    createTestConcept(c1Id, "Concept 1", undefined, cs1Id),
                    createTestConcept(c2Id, "Concept 2", undefined, cs2Id),
                    createTestConcept(c3Id, "Concept 3", undefined, cs2Id),
                    createTestConcept(c4Id, "Concept 4", undefined, cs2Id),
                    createTestConcept(c5Id, "Concept 5", undefined),
                    createTestConcept(c6Id, "Concept 6", undefined)
                ]
            }
            await cleanup(JSON.stringify(data));
            await syncData(data);

            let allConceptURIs = [c1Id, c2Id, c3Id, c4Id, c5Id, c6Id];
            let allConcepts = await getAllConcepts();
            let concepts = allConcepts.filter(cs => allConceptURIs.includes(cs.uri));
            expect(concepts.length).to.be.eql(6);
            allConceptURIs.forEach(u => {
                expect(concepts.filter(c => c.uri === u).length).to.be.eql(1);
            })

            //Now create a new CS with concept
            let cs3Id = "https://ex.com/cs/3"
            let conceptScheme3 = {
                "id" : cs3Id,
                "type" : "ConceptScheme",
                "title": {
                    "en-us": "CS 3"
                }
            }
            data = {
                "graph": [
                    conceptScheme3,
                    createTestConcept(c7Id, "Concept 7", undefined, cs3Id)
                ]
            }
            await cleanup(JSON.stringify(data));
            await syncData(data);

            //Assert other data is still there
            allConceptURIs = [c1Id, c2Id, c3Id, c4Id, c5Id, c6Id];
            allConcepts = await getAllConcepts();
            concepts = allConcepts.filter(cs => allConceptURIs.includes(cs.uri));
            expect(concepts.length).to.be.eql(6);
            allConceptURIs.forEach(u => {
                expect(concepts.filter(c => c.uri === u).length).to.be.eql(1);
            })
            //Assert new data is also there
            allConceptURIs = [c7Id];
            allConcepts = await getAllConcepts();
            concepts = allConcepts.filter(cs => allConceptURIs.includes(cs.uri));
            expect(concepts.length).to.be.eql(1);
            allConceptURIs.forEach(u => {
                expect(concepts.filter(c => c.uri === u).length).to.be.eql(1);
            })

            //Now delete a concept from the new CS and assert other data is still there
            data = {
                "graph": [conceptScheme3]
            }
            await syncData(data);

            //Assert other data is still there
            allConceptURIs = [c1Id, c2Id, c3Id, c4Id, c5Id, c6Id];
            allConcepts = await getAllConcepts();
            concepts = allConcepts.filter(cs => allConceptURIs.includes(cs.uri));
            expect(concepts.length).to.be.eql(6);
            allConceptURIs.forEach(u => {
                expect(concepts.filter(c => c.uri === u).length).to.be.eql(1);
            })
            //Assert new data is also there
            allConceptURIs = [c7Id];
            allConcepts = await getAllConcepts();
            concepts = allConcepts.filter(cs => allConceptURIs.includes(cs.uri));
            expect(concepts.length).to.be.eql(0);
        })

    })
})