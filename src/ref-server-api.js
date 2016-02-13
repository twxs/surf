import _ from 'lodash';
import express from 'express';
import {Disposable} from 'rx';

import {fetchAllRefsWithInfo} from './github-api';
const d = require('debug')('surf:ref-server-api');

export default function createRefServer(validNwos, port=null) {
  const app = express();

  port = port || process.env.SURF_PORT || '3000';
  app.get('/info/:owner/:name', async (req, res) => {
    try {
      if (!req.params.owner || !req.params.name) {
        throw new Error("no");
      }

      let needle = `${req.params.owner}/${req.params.name}`;
      if (!_.find(validNwos, (x) => x === needle)) {
        throw new Error("no");
      }

      res.json(await fetchAllRefsWithInfo(needle, req.params.skipCommitInfo, req.params.skipPrInfo));
    } catch (e) {
      d(e.message);
      d(e.stack);
      res.status(500).json({error: e.message});
    }
  });

  if (typeof(port) === 'string') {
    port = parseInt(port);
  }

  let server = app.listen(port);
  return Disposable.create(() => server.close(() => {}));
}
