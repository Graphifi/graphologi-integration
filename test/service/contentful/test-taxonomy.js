import '@dotenvx/dotenvx/config';
import {
    copyDataPropertyValue, createConcept, createConceptScheme, getAllConcepts, getAllConceptSchemes,
    listsEqual, syncData, toArray, typeConcept, typeConceptScheme
} from '../../../service/contentful/taxonomy.js'
import {expect} from "chai";
import {generateKeyPair} from "../../../service/authentication.js";
import {cleanup, deleteAllConcepts, deleteConceptScheme} from "../../util/contentfulUtil.js";

describe("Contentful integration", () => {

    before(async function () {
        let keyPair = generateKeyPair();
        process.env.GRAPHOLOGI_PUBLIC_KEY = keyPair.publicKey;
        process.env.TEST_GRAPHOLOGI_PRIVATE_KEY = keyPair.privateKey;
    })

    beforeEach(async function () {
        //await deleteAllConcepts();
        //await deleteAllConceptSchemes();
    });

    describe(" list equal", () => {
        it('same lists', () => {
            let actual = listsEqual(["a", "b"], ["a", "b"]);
            expect(actual).to.be.eql(true);
        });

        it('order should not matter ', () => {
            let actual = listsEqual(["a", "b", "c"], ["c", "b", "a"]);
            expect(actual).to.be.eql(true);
        });

        it('empty lists', () => {
            let actual = listsEqual([], []);
            expect(actual).to.be.eql(true);
        });

        it('first empty', () => {
            let actual = listsEqual([], ["a"]);
            expect(actual).to.be.eql(false);
        });

        it('second empty', () => {
            let actual = listsEqual(["a"], []);
            expect(actual).to.be.eql(false);
        });

        it('first subset', () => {
            let actual = listsEqual(["a"], ["a", "b"]);
            expect(actual).to.be.eql(false);
        });

        it('second subset', () => {
            let actual = listsEqual(["a", "b"], ["b"]);
            expect(actual).to.be.eql(false);
        });

        it('size same but element different', () => {
            let actual = listsEqual(["a", "b"], ["b", "c"]);
            expect(actual).to.be.eql(false);
        });
    })

    describe("copyDataPropertyValue", () => {
        it('should copy concept properties', async () => {
            let locales = [{"code": "en"}, {"code": "en-US"}];
            let graphologiConcept = {
                "id": "https://example.com/test1/caac69f6-d814-4f89-8234-1d51b16fbd9e",
                "altLabel": {
                    "en-us": [
                        "Top Concept 1 Alternative Label 1",
                        "Top Concept 1 Alternative Label 2",
                    ],
                    "en": [
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
                "id": "http://example.com/concepts/11111111/Cobra%20Plans",
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
                    "http://example.com/concepts/4585382/Health%20Insurance%20Plans"
                ],
                "notation": [
                    {
                        "@value": "11111111",
                        "type": "http://example.com/WANDCode"
                    },
                    "String value"
                ],
                "prefLabel": {
                    "en-US": "Cobra Plans"
                },
                "inScheme": [
                    "http://example.com/concepts/General%20Business%20Taxonomy"
                ],
                "type": "Concept"
            }
            let contentFulConcept = copyDataPropertyValue(typeConcept, graphologiConcept, locales);
            expect(contentFulConcept["uri"]).to.be.eql("http://example.com/concepts/11111111/Cobra%20Plans");

            expect(contentFulConcept["prefLabel"]).to.be.eql({"en-US": "Cobra Plans"});
            expect(contentFulConcept["altLabels"]["en-US"]).to.include("Consolidated Omnibus Budget Reconciliation Act Plans");
            expect(contentFulConcept["altLabels"]["en-US"].length).to.be.eql(1);
            expect(Object.keys(contentFulConcept).length).to.be.eql(5);

            expect(contentFulConcept["hiddenLabels"]["en-US"]).to.include("hiddenLabel 1");
            expect(contentFulConcept["hiddenLabels"]["en-US"]).to.include("hiddenLabel 2");
            expect(contentFulConcept["hiddenLabels"]["en-US"].length).to.be.eql(2);

            expect(contentFulConcept["notations"]).to.include("11111111");
            expect(contentFulConcept["notations"]).to.include("String value");

        })

        it('should copy concept properties when minimal graphologi concept', async () => {
            let locales = [{"code": "en"}, {"code": "en-US"}];
            let graphologiConcept = {
                "id": "http://example.com/concepts/11111111/Cobra%20Plans",
                "prefLabel": {
                    "en-US": "Cobra Plans"
                },
                "type": "Concept"
            }
            let contentFulConcept = copyDataPropertyValue(typeConcept, graphologiConcept, locales);
            expect(contentFulConcept["uri"]).to.be.eql("http://example.com/concepts/11111111/Cobra%20Plans");

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

    describe("syncData", () => {
        it('should update as changes are made in taxonomy', async () => {
            const cs1Id = "https://ex.com/cs/1";
            const c1Id = "https://ex.com/c/1";
            const c2Id = "https://ex.com/c/2";
            const c3Id = "https://ex.com/c/3";
            const c4Id = "https://ex.com/c/4";
            const c5Id = "https://ex.com/c/5";
            const c6Id = "https://ex.com/c/6";

            let allConceptSchemes = await getAllConceptSchemes();
            let foundCS = allConceptSchemes.find(cs => cs.uri === cs1Id);
            if(foundCS) {
                await deleteConceptScheme(foundCS);
            }
            await deleteAllConcepts([c1Id, c2Id, c3Id, c4Id]);

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
            await syncData(data);

            allConceptSchemes = await getAllConceptSchemes();
            foundCS = allConceptSchemes.find(cs => cs.uri === conceptScheme.id);
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
            concept4['related'] = [c1Id]
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
    })
})