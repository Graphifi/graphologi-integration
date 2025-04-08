import '@dotenvx/dotenvx/config';
import {
    copyDataPropertyValue,
    listsEqual,
    typeConcept,
    typeConceptScheme,
    validateConceptSchemeCounts,
    validateResources
} from '../../../service/contentful/taxonomy.js'
import {expect} from "chai";
import {generateKeyPair} from "../../../service/authentication.js";
import {createString, createTestConcept} from "../../util/taxonomyUtil.js";

describe("Contentful taxonomy service", () => {

    before(async function () {
        let keyPair = generateKeyPair();
        process.env.GRAPHOLOGI_PUBLIC_KEY = keyPair.publicKey;
        process.env.TEST_GRAPHOLOGI_PRIVATE_KEY = keyPair.privateKey;
    })

    beforeEach(async function () {
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

    describe("test validateConceptSchemeCounts", () => {
        let context = {
            'beforeUpdate': {
                'conceptSchemes': []
            },
            'locales': [{"code": "en"}, {"code": "en-US"}],
            'defaultLocaleCode': "en-US",
        }

        it('concept scheme limit happy path', async () => {
            let data = []
            for(let i = 0; i < 10; i++) {
                context['beforeUpdate']['conceptSchemes'].push({uri : "a"+i.toString()})
            }
            for(let i = 0; i < 10; i++) {
                data.push({id: "b"+i.toString(), type: typeConceptScheme})
            }
            let errorsCollector = []
            await validateConceptSchemeCounts(data, context, errorsCollector);
            expect(errorsCollector.length).to.be.eql(0);

        })

        it('concept scheme limit when payload concept schemes more than limit', async () => {
            let data = [];
            for (let i = 0; i < 21; i++) {
                data.push({id: "b"+i.toString(), type: typeConceptScheme})
            }
            let errorsCollector = []
            await validateConceptSchemeCounts(data, context, errorsCollector);
            expect(errorsCollector.length).to.be.eql(2);
            expect(errorsCollector[0]).to.be.eql(`Maximum 20 concept scheme allowed in Contentful. Payload contains 21.`);
            expect(errorsCollector[1]).to.be.eql(`Maximum ${20} concept scheme allowed in Contentful. Payload adds ${21} new concept schemes but there are already ${10} concept schemes in Contentful.`);
        })

        it('concept scheme limit when payload plus existing concept schemes more than limit', async () => {
            let data = [];
            for(let i = 0; i < 11; i++) {
                data.push({id: "b"+i.toString(), type: typeConceptScheme})
            }
            let errorsCollector = []
            await validateConceptSchemeCounts(data, context, errorsCollector);
            expect(errorsCollector.length).to.be.eql(1);
            expect(errorsCollector[0]).to.be.eql(`Maximum ${20} concept scheme allowed in Contentful. Payload adds ${11} new concept schemes but there are already ${10} concept schemes in Contentful.`);
        })
    })

    describe("test validateResources", () => {
        let context = {
            'beforeUpdate' : {
                'conceptSchemes': []
            },
            'locales' : [{"code": "en"}, {"code": "en-US"}],
            'defaultLocaleCode' : "en-US",
        }

        it('concept schemes resource properties happy path', async () => {
            let data = []
            let uri="";
            for (let i = 0; i < 500; i++) {
                uri = uri +"1";
            }
            data.push({
                id: uri,
                type: typeConceptScheme,
                title: {
                    "en-US": "Test 1"
                },
                description : {
                    "en-US": "Test description"
                }
            })

            let errorsCollector = []
            await validateResources(data, context, errorsCollector);
            expect(errorsCollector.length).to.be.eql(0);
        })

        it('concept schemes resource with extra properties', async () => {
            let data = []
            let uri="http://example.com/test1";
            data.push({
                id: uri,
                type: typeConceptScheme,
                title: {
                    "en-US": "Test 1"
                },
                description : {
                    "en-US": "Test description"
                },
                //Below properties are not for concept scheme in Contentful
                "prefLabel": {
                    "en-us": "PrefLabel value"
                },
                "modified": "2025-03-31T21:19:40.742Z",
                "useUuidIRI": true,
                "useXL": false,
                "minimiseEncoding": true,
                "revisionNo": 4
            })

            let errorsCollector = []
            await validateResources(data, context, errorsCollector);
            expect(errorsCollector.length).to.be.eql(0);
        })

        it('concept resource properties happy path', async () => {
            let data = []
            let uri= createString(500);

            let testConcept = createTestConcept(uri, "Pref Label", "Alt Label", "http;//ex.com", ["http://b.com"], ["http://nb.com"], ["http://r.com"], ["notation1"], "Example value", "Hidden label", "Editorial note", "Scope note", "History note", "Change note");
            data.push(testConcept)

            let errorsCollector = []
            await validateResources(data, context, errorsCollector);
            expect(errorsCollector.length).to.be.eql(0);
        })

        it('concept resource prefLabel is required', async () => {
            let data = []
            data.push({id : "a", type: typeConcept})

            let errorsCollector = []
            await validateResources(data, context, errorsCollector);
            expect(errorsCollector.length).to.be.eql(1);
            expect(errorsCollector[0]).to.be.eql("'prefLabel' is missing for concept with uri 'a' in locale en-US.");
        })

        it('concept resource prefLabel length', async () => {
            let data = []
            data.push({id : "a", type: typeConcept, 'prefLabel': {'en-US': createString(257)}})

            let errorsCollector = []
            await validateResources(data, context, errorsCollector);
            expect(errorsCollector.length).to.be.eql(1);
            expect(errorsCollector[0]).to.be.eql("'prefLabel' for concept 'a' in locale en-US is too long. Max length is 256.");

            data= [{id : "a", type: typeConcept, 'prefLabel': {'en-US': createString(256)}}]

            errorsCollector = []
            await validateResources(data, context, errorsCollector);
            expect(errorsCollector.length).to.be.eql(0);
        })

        it('concept resource altLabel, hiddenLabel and notation length', async () => {
            let data = []
            let altLabel = createString(257);
            let hiddenLabel = { "en-us": createString(257)};
            let notation1 = createString(257);
            data.push(createTestConcept("a", createString(256), altLabel, "http;//ex.com", ["http://b.com"], ["http://nb.com"], ["http://r.com"], [notation1], "Example value", hiddenLabel, "Editorial note", "Scope note", "History note", "Change note"))

            let errorsCollector = []
            await validateResources(data, context, errorsCollector);
            expect(errorsCollector.length).to.be.eql(3);
            expect(errorsCollector[0]).to.be.eql(`'altLabels' value '${altLabel}' for concept with uri 'a' is too long. Max length is 256.`);
            expect(errorsCollector[1]).to.be.eql(`'hiddenLabels' value '${hiddenLabel["en-us"]}' for concept with uri 'a' is too long. Max length is 256.`);
            expect(errorsCollector[2]).to.be.eql(`'notations' value '${notation1}' for concept with uri 'a' is too long. Max length is 256.`);

            data= [createTestConcept("a", createString(256), createString(256), "http;//ex.com", ["http://b.com"], ["http://nb.com"], ["http://r.com"], [createString(256)], "Example value", createString(256), "Editorial note", "Scope note", "History note", "Change note")]

            errorsCollector = []
            await validateResources(data, context, errorsCollector);
            expect(errorsCollector.length).to.be.eql(0);
        })

        it('concept resource one value for example and note properties when invalid', async () => {
            let data = [];
            let errorsCollector = [];
            let example = {
                "en-us": ["Top Concept 1 Example", "Top Concept 1 Example 2"]
            }
            let editorialNote = {
                "en-us": ["Top Concept 1 Editorial Note 1", "Top Concept 1 Editorial Note 2"]
            }
            let scopeNote = {
                "en-us": [  "Top Concept 1 Scope Note 1", "Top Concept 1 Scope Note 2"]
            }
            let historyNote = {
                "en-us": ["Top Concept 1 History Note 1",  "Top Concept 1 History Note 2"]
            }
            let changeNote = {
                "en-us": ["Top Concept 1 Change Note 1", "Top Concept 1 Change Note 2"]
            }
            let testConcept = createTestConcept("a", createString(10), createString(10), "http;//ex.com", ["http://b.com"], ["http://nb.com"], ["http://r.com"], [createString(10)], example, createString(10), editorialNote, scopeNote, historyNote, changeNote);
            data.push(testConcept)
            await validateResources(data, context, errorsCollector);
            expect(errorsCollector.length).to.be.eql(5);
            expect(errorsCollector[0]).to.be.eql(`To many 'note' for concept with uri 'a' only 1 value allowed.`);
            expect(errorsCollector[1]).to.be.eql(`To many 'editorialNote' for concept with uri 'a' only 1 value allowed.`);
            expect(errorsCollector[2]).to.be.eql(`To many 'example' for concept with uri 'a' only 1 value allowed.`);
            expect(errorsCollector[3]).to.be.eql(`To many 'historyNote' for concept with uri 'a' only 1 value allowed.`);
            expect(errorsCollector[4]).to.be.eql(`To many 'scopeNote' for concept with uri 'a' only 1 value allowed.`);
        });

        it('concept resource one value for example and note properties when valid', async () => {
            let data = [];
            let errorsCollector = [];
            let example = {
                "en-us": "Top Concept 1 Example"
            }
            let editorialNote = {
                "en-us": "Top Concept 1 Editorial Note 1"
            }
            let scopeNote = {
                "en-us": "Top Concept 1 Scope Note 1"
            }
            let historyNote = {
                "en-us": "Top Concept 1 History Note 1"
            }
            let changeNote = {
                "en-us": "Top Concept 1 Change Note 1"
            }
            let testConcept = createTestConcept("a", createString(10), createString(10), "http;//ex.com", ["http://b.com"], ["http://nb.com"], ["http://r.com"], [createString(10)], example, createString(10), editorialNote, scopeNote, historyNote, changeNote);
            data.push(testConcept)
            await validateResources(data, context, errorsCollector);
            expect(errorsCollector.length).to.be.eql(0);
        });

        it('concept notation is unique within payload ', async () => {

            let data = [];
            let errorsCollector = [];

            let testConcept1 = createTestConcept("a", "Label");
            testConcept1.notation.push("notation1");

            let testConcept2 = createTestConcept("b", "Label");
            testConcept2.notation.push("notation2");
            testConcept2.notation.push("notation1");

            data.push(testConcept1);
            data.push(testConcept2);

            await validateResources(data, context, errorsCollector);

            expect(errorsCollector.length).to.be.eql(2);
            expect(errorsCollector[0]).to.be.eql(`Notation value 'notation1' for concept with uri 'a' is already used in concept with uri 'b'.`);
            expect(errorsCollector[1]).to.be.eql(`Notation value 'notation1' for concept with uri 'b' is already used in concept with uri 'a'.`);

        });

        it('concept notation is unique in payload and other concepts in CF', async () => {
            let data = [];
            let errorsCollector = [];
            let context = {
                'beforeUpdate' : {
                    'conceptSchemes': [],
                    'concepts': [
                        {uri : 'x', 'notations': ['notation1']},
                    ]
                },
                'locales' : [{"code": "en"}, {"code": "en-US"}],
                'defaultLocaleCode' : "en-US",
            }
            let testConcept1 = createTestConcept("a", "Label");
            testConcept1.notation.push("notation1");

            data.push(testConcept1);

            await validateResources(data, context, errorsCollector);

            expect(errorsCollector.length).to.be.eql(1);
            expect(errorsCollector[0]).to.be.eql(`Notation value 'notation1' for concept with uri 'a' is already used in concept with uri 'x'.`);

        })
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
            }
            let contentFulConcept = copyDataPropertyValue(graphologiConcept, locales);

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

            expect(contentFulConcept["note"]["en-US"]).to.be.eql("Top Concept 1 Change Note 1");
            expect(contentFulConcept["definition"]["en-US"]).to.be.eql("Top Concept 1 Definition 1");
            expect(contentFulConcept["editorialNote"]["en-US"]).to.be.eql("Top Concept 1 Editorial Note 1");
            expect(contentFulConcept["example"]["en-US"]).to.be.eql("Top Concept 1 Example 2");
            expect(contentFulConcept["historyNote"]["en-US"]).to.be.eql("Top Concept 1 History Note 1");
            expect(contentFulConcept["scopeNote"]["en-US"]).to.be.eql("Top Concept 1 Scope Note 1");

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
            let contentFulConcept = copyDataPropertyValue(graphologiConcept, locales);
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
            let contentFulConcept = copyDataPropertyValue(graphologiConcept, locales);
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
            let contentFulConceptScheme = copyDataPropertyValue(graphologiConceptScheme, locales);

            expect(contentFulConceptScheme["uri"]).to.be.eql("https://example.com/test2");

            expect(contentFulConceptScheme["prefLabel"]["en-US"]).to.be.eql("Test 2");
            expect(contentFulConceptScheme["definition"]["en-US"]).to.be.eql("Test 2 description");

            expect(Object.keys(contentFulConceptScheme).length).to.be.eql(3);
        })
    })
})