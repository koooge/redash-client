'use strict';

const Client = require('../');
const assert = require('assert');
const Mock = require('axios-mock-adapter');

require('axios-debug-log');

describe('RedashClient', () => {
  it('should be a constructor', () => {
    const client = new Client();
    assert(client instanceof Client);
  });

  describe('api', () => {
    let client, mock;

    beforeEach(() => {
      client = new Client({
        endPoint: 'https://demo.redash.io/',
        apiToken: process.env.API_TOKEN || 'abc123',
      });
      mock = new Mock(client.axios_);
    });

    it('postQuery with max_age = 0', async () => {
      const expectedBody = require('./fixtures/post-query_results-max_age_0');

      mock.onPost('/api/query_results').reply(200, expectedBody);
      const result = await client.postQuery({
        query: 'select * from cohort2',
        data_source_id: 2,
        max_age: 0,
      });
      assert.deepEqual(result, expectedBody);
    });

    it('getJob', async () => {
      const expectedBody = require('./fixtures/get-jobs-1');

      const {id} = expectedBody.job;
      mock.onGet(`/api/jobs/${id}`).reply(200, expectedBody);
      const result = await client.getJob(id);
      assert.deepEqual(result, expectedBody);
    });

    it('getQueryResult', async () => {
      const expectedBody = require('./fixtures/get-query_results');

      const {id} = expectedBody.query_result;
      mock.onGet(`/api/query_results/${id}`).reply(200, expectedBody);
      const result = await client.getQueryResult(id);
      assert.deepEqual(result, expectedBody);
    });

    it('queryAndWaitResult', async () => {
      const job1 = require('./fixtures/post-query_results-max_age_0');
      const job2 = require('./fixtures/get-jobs-2');
      const job3 = require('./fixtures/get-jobs-3');
      const queryResult = require('./fixtures/get-query_results');

      const jobId = job1.job.id;
      const queryResultId = job3.job.query_result_id;
      mock.onPost('/api/query_results').reply(200, job1);
      mock.onGet(`/api/jobs/${jobId}`).replyOnce(200, job2);
      mock.onGet(`/api/jobs/${jobId}`).replyOnce(200, job3);
      mock.onGet(`/api/query_results/${queryResultId}`).reply(200, queryResult);

      const actual = await client.queryAndWaitResult({
        query: 'select * from cohort2',
        data_source_id: 2,
        max_age: 0,
      });
      assert.deepEqual(actual, queryResult);
    });

    it('queryAndWaitResult: timeout', function(done) {
      this.timeout(3000);

      const job1 = require('./fixtures/post-query_results-max_age_0');
      const job2 = require('./fixtures/get-jobs-2');

      const jobId = job1.job.id;
      mock.onPost('/api/query_results').reply(200, job1);
      mock.onGet(`/api/jobs/${jobId}`).reply(200, job2);

      client.queryAndWaitResult({
        query: 'select * from cohort2',
        data_source_id: 2,
        max_age: 0,
      }, 1000).catch(e => {
        assert(/polling timeout/.test(e.message));
        done();
      });
    });
  });
});
