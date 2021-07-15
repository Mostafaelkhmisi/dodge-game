const fs = require('fs');
const Hapi = require('hapi');
const path = require('path');
const Boom = require('boom');
const color = require('color');
const ext = require('commander');
const jsonwebtoken = require('jsonwebtoken');
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');
// const request = require('request');

// The developer rig uses self-signed certificates.  Node doesn't accept them
// by default.  Do not use this in production.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Use verbose logging during development.  Set this to false for production.
const verboseLogging = true;
const verboseLog = verboseLogging ? console.log.bind(console) : () => { };

// Service state variables
const initialColor = color('#6441A4');      // set initial color; bleedPurple
const bearerPrefix = 'Bearer ';             // HTTP authorization headers have this prefix
const colorWheelRotation = 30;
const channelColors = {};
const channelScores = {};
const initialScore = 0;  // set initial score; 0

const STRINGS = {
  secretEnv: usingValue('secret'),
  clientIdEnv: usingValue('client-id'),
  serverStarted: 'Server running at %s',
  secretMissing: missingValue('secret', 'EXT_SECRET'),
  clientIdMissing: missingValue('client ID', 'EXT_CLIENT_ID'),
  puttingScore: 'putting Score for c:%s on behalf of u:%s',
  sendScore: 'Sending Score %s to c:%s',
  invalidAuthHeader: 'Invalid authorization header',
  invalidJwt: 'Invalid JWT'
};

ext.
  version(require('../package.json').version).
  option('-s, --secret <secret>', 'Extension secret').
  option('-c, --client-id <client_id>', 'Extension client ID').
  option('-o, --owner-id <owner_id>', 'Extension owner ID').
  parse(process.argv);

const ownerId = getOption('ownerId', 'EXT_OWNER_ID');
const secret = Buffer.from(getOption('secret', 'ENV_SECRET'), 'base64');
const clientId = getOption('clientId', 'ENV_CLIENT_ID');

const serverOptions = {
  host: 'localhost',
  port: 8081,
  routes: {
    cors: {
      origin: ['*']
    }
  }
};
const serverPathRoot = path.resolve(__dirname, '..', 'conf', 'server');
if (fs.existsSync(serverPathRoot + '.crt') && fs.existsSync(serverPathRoot + '.key')) {
  serverOptions.tls = {
    // If you need a certificate, execute "npm run cert".
    cert: fs.readFileSync(serverPathRoot + '.crt'),
    key: fs.readFileSync(serverPathRoot + '.key')
  };
}
const server = new Hapi.Server(serverOptions);

(async () => {
  // Handle a viewer request to send Score.
  server.route({
    method: 'POST',
    path: '/game/score',
    handler: scoreSendingHandler
  });
// Handle a new viewer to get Score.
  server.route({
    method: 'get',
    path: '/game/query',
    handler: scoreQueryHandler
  });

  // Start the server.
  await server.start();
  console.log(STRINGS.serverStarted, server.info.uri);
})();

function usingValue (name) {
  return `Using environment variable for ${name}`;
}

function missingValue (name, variable) {
  const option = name.charAt(0);
  return `Extension ${name} required.\nUse argument "-${option} <${name}>" or environment variable "${variable}".`;
}

// Get options from the command line or the environment.
function getOption (optionName, environmentName) {
  const option = (() => {
    if (ext[optionName]) {
      return ext[optionName];
    } else if (process.env[environmentName]) {
      console.log(STRINGS[optionName + 'Env']);
      return process.env[environmentName];
    }
    console.log(STRINGS[optionName + 'Missing']);
    process.exit(1);
  })();
  console.log(`Using "${option}" for ${optionName}`);
  return option;
}

// Verify the header and the enclosed JWT.
function verifyAndDecode (header) {
  if (header.startsWith(bearerPrefix)) {
    try {
      const token = header.substring(bearerPrefix.length);
      return jsonwebtoken.verify(token, secret, { algorithms: ['HS256'] });
    }
    catch (ex) {
      throw Boom.unauthorized(STRINGS.invalidJwt);
    }
  }
  throw Boom.unauthorized(STRINGS.invalidAuthHeader);
}


function scoreQueryHandler (req) {
  // Verify all requests.
  const payload = verifyAndDecode(req.headers.authorization);

  // Get the color for the channel from the payload and return it.
  const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;
  const currentScore = channelScores[channelId] || initialScore;
  verboseLog(STRINGS.sendScore, currentScore, opaqueUserId);
  // console.log(currentScore, "getting Score")
  return currentScore;
}

function scoreSendingHandler (req) {
  console.log(req.payload, "payload")
  // Verify all requests.
  const payload = verifyAndDecode(req.headers.authorization);
  const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;

  verboseLog(STRINGS.puttingScore, channelId, opaqueUserId);
  // Store the color for the channel.
  const currentScore = channelScores[channelId];

  // Save the new color for the channel.
  channelColors[channelId] = currentScore;
  
  // console.log(currentScore, "Sending", channelId, "id", opaqueUserId,"userId")
  return "Successfully Sent To Database";
}


// function colorCycleHandler (req) {
//   // Verify all requests.
//   const payload = verifyAndDecode(req.headers.authorization);
//   const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;

//   // Store the color for the channel.
//   let currentColor = channelColors[channelId] || initialColor;

//   // Rotate the color as if on a color wheel.
//   verboseLog(STRINGS.cyclingColor, channelId, opaqueUserId);
//   currentColor = color(currentColor).rotate(colorWheelRotation).hex();

//   // Save the new color for the channel.
//   channelColors[channelId] = currentColor;

//   return currentColor;
// }



// function colorQueryHandler (req) {
//   // Verify all requests.
//   const payload = verifyAndDecode(req.headers.authorization);

//   // Get the color for the channel from the payload and return it.
//   const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;
//   const currentColor = color(channelColors[channelId] || initialColor).hex();
//   verboseLog(STRINGS.sendColor, currentColor, opaqueUserId);
//   return currentColor;
// }
