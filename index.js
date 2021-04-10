const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION,
});

// TODO - when something fails in function we need to delete whatever created earlier, like "certificates,things"
const iot = new AWS.Iot();

const createThingAndAttachCerts = async (event) => {
  try {
    // 1. Create new certificate
    const certRes = await new Promise((resolve, reject) => {
      const params = {
        setAsActive: true,
      };
      iot.createKeysAndCertificate(params, function (err, data) {
        if (err) reject(err);
        else resolve(data);
      });
    });

    console.log('certRes >> ', certRes);

    // 2. Attaching policy to certificate

    const policyToCertRes = await new Promise((resolve, reject) => {
      iot.attachPolicy(
        {
          policyName: 'medium-iotcore',
          target: certRes.certificateArn,
        },
        (err, data) => {
          if (err) reject(err);
          else resolve(data);
        }
      );
    });
    console.log('policyToCertRes >> ', policyToCertRes);

    // 3. Create Thing

    const thingRes = await new Promise((resolve, reject) => {
      iot.createThing(
        { thingName: event.macAddress },
        // { thingName: event.queryStringParameters.macAddress }, // this is for lamda
        function (err, data) {
          if (err) reject(err);
          else resolve(data);
        }
      );
    });

    console.log('thingRes >> ', thingRes);

    // 4. Attach certificate to thing

    const attachedCertThingRes = await new Promise((resolve, reject) => {
      const params = {
        principal: certRes.certificateArn,
        thingName: thingRes.thingName,
      };
      iot.attachThingPrincipal(params, function (err, attachCertRes) {
        if (err) reject(err);
        else resolve(attachCertRes);
      });
    });

    console.log('attachedCertThingRes >> ', attachedCertThingRes);

    // return certRes;
    return {
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
        'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
        'Access-Control-Allow-Methods': '*',
      },
      statusCode: 200,
      body: JSON.stringify(certRes),
    };
  } catch (e) {
    console.log(e);
    return {
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
        'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
        'Access-Control-Allow-Methods': '*',
      },
      statusCode: 200,
      body: { message: e.message },
    };
  }
};

// this is to test locally
createThingAndAttachCerts({ macAddress: '11:11:11:11:11:11' });

// this is for Lamda
// exports.handler = createThingAndAttachCerts;
