import _ from 'lodash';
import path from 'path';
import {fs} from '../src/promisify';
import BuildMonitor from '../src/build-monitor';
import {Observable, TestScheduler} from 'rx';

const d = require('debug')('serf-test:build-monitor');

function getSeenRefs(refs) {
  return _.reduce(refs, (acc, x) => {
    acc.add(x.object.sha);
    return acc;
  }, new Set());
}

describe.only('the build monitor', function() {
  beforeEach(async function() {
    let acc = {};
    let fixturesDir = path.join(__dirname, '..', 'fixtures');

    for (let name of await fs.readdir(fixturesDir)) {
      if (!name.match(/^refs.*\.json$/i)) continue;

      let contents = await fs.readFile(path.join(fixturesDir, name), 'utf8');
      acc[name] = JSON.parse(contents.split('\n')[0]);
    }

    this.refExamples = acc;

    this.sched = new TestScheduler();
    this.fixture = new BuildMonitor(null, 2, null, null, this.sched);
  });

  afterEach(function() {
    this.fixture.dispose();
  });

  it('should decide to build new refs from a blank slate', function() {
    this.fixture.fetchRefs = () =>
      Observable.just(this.refExamples['refs1.json']);

    let buildCount = 0;
    this.fixture.runBuild = () => {
      buildCount++;
      return Observable.just('');
    };

    this.fixture.start();
    expect(buildCount).to.equal(0);

    this.sched.advanceBy(30*1000);
    expect(buildCount).to.equal(10);
  });

  it('should decide to build only changed refs', function() {
    this.fixture.fetchRefs = () =>
      Observable.just(this.refExamples['refs1.json']);

    let buildCount = 0;
    this.fixture.runBuild = () => {
      buildCount++;
      return Observable.just('');
    };

    this.fixture.start();
    expect(buildCount).to.equal(0);

    this.sched.advanceBy(this.fixture.pollInterval + 1000);
    expect(buildCount).to.equal(10);

    this.fixture.fetchRefs = () =>
      Observable.just(this.refExamples['refs2.json']);

    // Move to the next interval, we should only run the one build
    this.sched.advanceBy(this.fixture.pollInterval);
    expect(buildCount).to.equal(11);
  });
});
