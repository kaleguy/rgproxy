/*jslint node: true, indent: 2 */
'use strict';

var swaggerJSDoc = require('swagger-jsdoc');
var exports = module.exports = {};

var options = {
  swaggerDefinition: {
    info: {
      title: 'OpenWeatherMap Proxy', // Title (required)
      description: 'This is a simple wrapper for the OpenWeatherMap API.',
      version: '1.0.0' // Version (required)
    },
    host:'localhost:8888',
    basePath: '',
    schemes: ['http']
  },
  apis: [
    __dirname + '/routes/weather.js',
    __dirname + '/index.js'
  ] // Path to the API docs
};
var swaggerSpec = swaggerJSDoc(options);

/**
 *
 * @swagger
 * definitions:
 *   report:
 *     type: object
 *     required:
 *       - coord
 *       - weather
 *       - base
 *       - main
 *       - visibility
 *       - wind
 *       - clouds
 *       - dt
 *       - sys
 *       - id
 *       - name
 *       - cod
 *     properties:
 *       coord:
 *         type: object
 *       weather:
 *         type: array
 *         items:
 *           type: string
 *       base:
 *         type: string
 *       main:
 *         type: object
 *       visibility:
 *         type: integer
 *       wind:
 *         type: object
 *       clouds:
 *         type: object
 *       dt: integer
 *       sys:
 *         type: object
 *       id: integer
 *       name: string
 *       cod: integer
 *
 */



 var restify, bunyan, routes, log, server;

restify = require('restify');
bunyan  = require('bunyan');
routes  = require('./routes/');

log = bunyan.createLogger({
  name        : 'restify',
  level       : process.env.LOG_LEVEL || 'info',
  stream      : process.stdout,
  serializers : bunyan.stdSerializers
});

server = restify.createServer({
  name : 'restify',
  log  : log,
  formatters : {
    'application/json' : function (req, res, body, cb) {
      res.setHeader('Cache-Control', 'must-revalidate');

      // Does the client *explicitly* accept application/json?
      var sendPlainText = (req.header('Accept').split(/, */).indexOf('application/json') === -1);

      // Send as plain text (not used by any route in this project)
      // if (sendPlainText) {
      //  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      //}

      // Send as JSON
      if (!sendPlainText) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      return cb(null, JSON.stringify(body));
    }
  }
});

server.use(restify.CORS({
  origins: ['https://kaleguy.github.io']//,   // defaults to ['*']
//  credentials: true,                 // defaults to false
 // headers: ['x-foo']                 // sets expose-headers
}));
server.use(restify.bodyParser({ mapParams: false }));
server.use(restify.queryParser());
server.use(restify.gzipResponse());
server.pre(restify.pre.sanitizePath());

/*jslint unparam:true*/
// Default error handler. Personalize according to your needs.
/* istanbul ignore next */
server.on('uncaughtException', function (req, res, route, err) {
  console.log('******* Begin Error *******');
  console.log(route);
  console.log('*******');
  console.log(err.stack);
  console.log('******* End Error *******');
  if (!res.headersSent) {
    return res.send(500, { ok : false });
  }
  res.write("\n");
  res.end();
});
/*jslint unparam:false*/

server.on('after', restify.auditLogger({ log: log }));
routes(server);

// serve swagger docs
server.get(/\/public\/?.*/, restify.serveStatic({
  directory: __dirname
}));

// serve swagger spec
server.get('/api-docs.json', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

console.log('Server started.');
server.listen(process.env.PORT || 8888, function () {
  log.info('%s listening at %s', server.name, server.url);
});

exports.close = function(){
  server.close();
};

