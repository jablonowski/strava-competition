const { onRequest }    = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const app              = require('./app');

const STRAVA_CLIENT_ID     = defineSecret('STRAVA_CLIENT_ID');
const STRAVA_CLIENT_SECRET = defineSecret('STRAVA_CLIENT_SECRET');
const STRAVA_REFRESH_TOKEN = defineSecret('STRAVA_REFRESH_TOKEN');
const STRAVA_CLUB_ID       = defineSecret('STRAVA_CLUB_ID');

exports.api = onRequest(
  { secrets: [STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN, STRAVA_CLUB_ID] },
  (req, res) => app(req, res),
);
