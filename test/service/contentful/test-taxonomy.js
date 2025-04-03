import {
    listsEqual
} from '../../../service/contentful/taxonomy.js'
import {expect} from "chai";


describe(" list equal", () => {
    it('same lists', () => {
        let actual = listsEqual(["a", "b"], ["a", "b"]);
        expect(actual).to.be.eql(true);
    });

    it('order should not matter ', () => {
        let actual = listsEqual(["a", "b", "c"], [ "c", "b", "a"]);
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
