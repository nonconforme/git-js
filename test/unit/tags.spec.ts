import expect = require('expect');
import { SinonSandbox, createSandbox } from 'sinon';
import { simpleGitBuilder, SimpleGit, PotentialError } from '../../src';
import dependencies from '../../src/util/dependencies';
import { TagList, tagListParser } from '../../src/responses';
import { MockBuffer } from './include/mock-buffer';
import { MockChildProcess } from './include/mock-child-process';

describe('tags', () => {

   let sandbox: SinonSandbox;
   let git: SimpleGit;

   let childProcess: any;

   function theCommandRun () {
      return childProcess.$args;
   }

   beforeEach(() => {
      sandbox = createSandbox();
      sandbox.stub(dependencies, 'buffer').returns(new MockBuffer(sandbox));
      sandbox.stub(dependencies, 'childProcess').returns(childProcess = new MockChildProcess(sandbox));
      git = simpleGitBuilder();
   });

   afterEach(() => sandbox.restore());

   it('tag with options array', () => {
      git.tag(['-a', 'new-tag-name', '-m', 'commit message', 'cbb6fb8']);
      expect(['tag', '-a', 'new-tag-name', '-m', 'commit message', 'cbb6fb8']).toEqual(theCommandRun());
   });

   it('tag with options object', () => {
      git.tag({
         '--annotate': null,
         'some-new-tag': null,
         '--message': 'commit message',
         'cbb6fb8': null
      });

      expect(['tag', '--annotate', 'some-new-tag', '--message=commit message', 'cbb6fb8']).toEqual(theCommandRun());
   });

   it('with a character prefix', () => {
      const tagList = tagListParser('v1.0.0 \n v0.0.1 \n v0.6.2');

      expect(tagList.latest).toBe('v1.0.0');
      expect(tagList.all).toEqual(['v0.0.1', 'v0.6.2', 'v1.0.0']);
   });


   it('with a character prefix and different lengths', () => {
      const tagList = tagListParser('v1.0 \n v1.0.1');

      expect(tagList.latest).toBe('v1.0.1');
      expect(tagList.all).toEqual(['v1.0', 'v1.0.1']);
   });

   it('with max count shorthand property', (done) => {
      git.tags((err: PotentialError, result: TagList) => {
         expect(err).toBe(null);
         expect(theCommandRun()).toEqual(["tag", "-l"]);
         expect(result.latest).toBe('1.2.1');
         expect(result.all).toEqual(['0.1.1', '1.1.1', '1.2.1']);

         done();
      });

      childProcess.$closeWith(`
         0.1.1
         1.2.1
         1.1.1
      `);

   });

   it('removes empty lines', (done) => {
      git.tags((err: PotentialError, result: TagList) => {
         expect(err).toBe(null);
         expect(theCommandRun()).toEqual(["tag", "-l"]);
         expect(result.latest).toBe('1.10.0');
         expect(result.all).toEqual(['0.1.0', '0.2.0', '0.10.0', '0.10.1', '1.10.0', 'tagged']);

         done();
      });

      childProcess.$closeWith(`
         0.1.0
         0.10.0
         0.10.1
         0.2.0
         1.10.0
         tagged
      `);

   });

   it('alpha sorts tags after numeric tags', () => {
      expect(tagListParser('1.0.0\n0.1.0\nxyz\ntagged').all).toEqual(['0.1.0', '1.0.0', 'tagged', 'xyz']);
   });

   it('respects a custom sort order', (done) => {
      git.tags({'--sort': 'foo'}, (err: PotentialError, result?: TagList) => {
         expect(err).toBe(null);
         expect(theCommandRun()).toEqual(["tag", "-l", "--sort=foo"]);

         expect(result && result.latest).toBe('aaa');
         expect(result && result.all).toEqual(['aaa', '0.10.0', '0.2.0', 'bbb']);

         done();
      });

      childProcess.$closeWith(`
         aaa
         0.10.0
         0.2.0
         bbb
      `);
   });

});

