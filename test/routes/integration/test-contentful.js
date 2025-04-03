import '@dotenvx/dotenvx/config';

import chaiModule, {expect} from 'chai';
import chaiHttp from 'chai-http';
import {app} from '../../../app.js';
import fs from 'fs';
import {getAllConcepts, toArray, typeConcept} from '../../../service/contentful/taxonomy.js'
import {generateKeyPair, sign} from "../../../service/authentication.js";
import {assertConceptsEqual, cleanup, deleteAllConcepts, deleteAllConceptSchemes} from "../../util/contentfulUtil.js";

const chai = chaiModule.use(chaiHttp);

const taxonomyEndpoint = '/integration/contentful/taxonomy';


describe("Contentful integration", () => {

    before(async function(){
        let keyPair = generateKeyPair();
        process.env.GRAPHOLOGI_PUBLIC_KEY = keyPair.publicKey;
        process.env.TEST_GRAPHOLOGI_PRIVATE_KEY = keyPair.privateKey;
    })

    beforeEach(async function () {
        await deleteAllConcepts();
        await deleteAllConceptSchemes();
    });


    describe(" "+taxonomyEndpoint, () => {

        it("should accept jsonld", async () => {
            let payload = {
                "@context": {},
                "graph": []
            };
            let privateKey = process.env.TEST_GRAPHOLOGI_PRIVATE_KEY;
            let authorization = sign(privateKey, payload);

            let {res} = await chai.request(app)
                .put(taxonomyEndpoint)
                .set('Content-Type', "application/ld+json")
                .set('Authorization', authorization)
                .send(payload);

            expect(res.statusCode).to.be.eql(200);
        })

        it("should sync a complex taxonomy", async () => {
            let data = fs.readFileSync("test/routes/integration/go-taxonomy-test1.json", 'utf-8');
            await cleanup(data);
            let allConcepts = await getAllConcepts();
            let concept = allConcepts.find(c => c.uri === "https://example.com/test1/caac69f6-d814-4f89-8234-1d51b16fbd9e");
            expect(concept).to.be.eql(undefined);

            let privateKey = process.env.TEST_GRAPHOLOGI_PRIVATE_KEY;
            let authorization = sign(privateKey, JSON.parse(data));

            let {res} = await chai.request(app)
                .put(taxonomyEndpoint)
                .set('Content-Type', "application/json")
                .set('Authorization', authorization)
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
            let privateKey = process.env.TEST_GRAPHOLOGI_PRIVATE_KEY;
            let authorization = sign(privateKey, JSON.parse(data));

            let {res} = await chai.request(app)
                .put(taxonomyEndpoint)
                .set('Content-Type', "application/json")
                .set('Authorization', authorization)
                .send(data);
            expect(res.statusCode).to.be.eql(200);
            let allConcepts2 = await getAllConcepts();
            JSON.parse(data).graph.forEach(gr => {
                if(toArray(gr.type).includes(typeConcept)) {
                    let uri = gr.id;
                    let foundConcept = allConcepts2.find(ac => ac.uri === uri);
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
                expect(concept).to.be.eql(undefined);
            })

            let privateKey = process.env.TEST_GRAPHOLOGI_PRIVATE_KEY;
            let authorization = sign(privateKey, data);

            let {res} = await chai.request(app)
                .put(taxonomyEndpoint)
                .set('Content-Type', "application/json")
                .set('Authorization', authorization)
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