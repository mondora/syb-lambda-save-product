import "babel-polyfill";
import axios from "axios";
import moment from "moment";

function createProduct(context, businessName, zuoraApiHost, zuoraHeaders, today, endDate) {
    axios.post(`https://${zuoraApiHost}/v1/object/product`, {
        Name: businessName,
        Description: "Product created through StartYourBusiness",
        EffectiveEndDate: endDate,
        EffectiveStartDate: today
    }, zuoraHeaders)
        .then(({data}) => {
            if (data.Success) {
                console.log("ZUORA OK");
                createProductRatePlan(context, `${businessName}_1`, zuoraApiHost, zuoraHeaders, today, endDate, data.Id);
                createProductRatePlan(context, `${businessName}_2`, zuoraApiHost, zuoraHeaders, today, endDate, data.Id);
                createProductRatePlan(context, `${businessName}_3`, zuoraApiHost, zuoraHeaders, today, endDate, data.Id);
            } else {
                console.log("ZUORA ERROR");
                console.log(data);
                context.fail(JSON.stringify({
                    code: "ZuoraError",
                    ...data
                }));
            }
        })
        .catch(error => {
            console.log("ZUORA ERROR");
            console.log(error);
            context.fail(JSON.stringify({
                code: "ZuoraError",
                ...error
            }));
        });
}

function createProductRatePlan(context, ratePlanName, zuoraApiHost, zuoraHeaders, today, endDate, productId) {
    axios.post(`https://${zuoraApiHost}/v1/object/product-rate-plan`, {
        Name: ratePlanName,
        Description: "Product rate plan created through StartYourBusiness",
        EffectiveEndDate: endDate,
        EffectiveStartDate: today,
        ProductId: productId
    }, zuoraHeaders)
        .then(({data}) => {
            if (data.Success) {
                console.log("ZUORA OK");
            } else {
                console.log("ZUORA ERROR");
                console.log(data);
                context.fail(JSON.stringify({
                    code: "ZuoraError",
                    ...data
                }));
            }
        })
        .catch(error => {
            console.log("ZUORA ERROR");
            console.log(error);
            context.fail(JSON.stringify({
                code: "ZuoraError",
                ...error
            }));
        });
}

exports.handler = function(event, context) {
    console.log("Received event:", JSON.stringify(event, null, 2));
    console.log("Received context:", JSON.stringify(context, null, 2));

    const {zuoraApiHost} = event["stage-variables"];
    const zuoraHeaders = {
        headers: {
            ...event["stage-variables"],
            "Content-Type": "application/json"
        }
    };
    const today = moment().format("YYYY-MM-DD");
    const endDate = moment().add(10, "years").format("YYYY-MM-DD");

    const {businessName, productId, productPlans} = event["body-json"];

    if (!productId) {
        createProduct(context, businessName, zuoraApiHost, zuoraHeaders, today, endDate, productPlans);
    }
};