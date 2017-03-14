import "babel-polyfill";
import Nuora from 'nuora';

exports.handler = function(event, context) {
    console.log("Received event:", JSON.stringify(event, null, 2));
    console.log("Received context:", JSON.stringify(context, null, 2));

    const {apiAccessKeyId, apiSecretAccessKey} = event["stage-variables"];

    // const {productId} = event["body-json"];

    Nuora.config.zuora.username = apiAccessKeyId;
    Nuora.config.zuora.password = apiSecretAccessKey;
    Nuora.config.zuora.wsdl = '/zuora.a.84.0.wsdl';

    const {zuora} = Nuora.build();
    zuora.once('loggedin', () => {
        console.log('Nuora is ready!');
    });
};