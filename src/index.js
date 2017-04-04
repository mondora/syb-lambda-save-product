import "babel-polyfill";
import axios from "axios";
import moment from "moment";

function createProduct(context, businessName, zuoraHost, zuoraHeaders, today, endDate, productPlans) {
    axios.post(`https://rest.${zuoraHost}/v1/object/product`, {
        Name: businessName,
        Description: "Product created through StartYourBusiness",
        EffectiveEndDate: endDate,
        EffectiveStartDate: today
    }, zuoraHeaders)
        .then(({data}) => {
            if (data.Success) {
                console.log("ZUORA OK");
                productPlans.forEach((plan, index) => {
                    createProductRatePlan(context, `${businessName}_${index + 1}`, zuoraHost, zuoraHeaders, today, endDate, data.Id, plan);
                });
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

function createProductRatePlan(context, ratePlanName, zuoraHost, zuoraHeaders, today, endDate, productId, productPlan) {
    //TODO save features
    axios.post(`https://rest.${zuoraHost}/v1/object/product-rate-plan`, {
        Name: ratePlanName,
        Description: productPlan.description,
        EffectiveEndDate: endDate,
        EffectiveStartDate: today,
        ProductId: productId
    }, zuoraHeaders)
        .then(({data}) => {
            if (data.Success) {
                console.log("ZUORA OK");
                productPlan.id = data.Id;
                createProductRatePlanCharge(context, zuoraHost, zuoraHeaders, productPlan);
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

function createProductRatePlanCharge(context, zuoraHost, zuoraHeaders, productPlan) {
    axios.post(`https://rest.${zuoraHost}/v1/action/create`, {
        type: "ProductRatePlanCharge",
        objects: [{
            BillCycleType: "DefaultFromCustomer",
            BillingPeriod: productPlan.frequency,
            ChargeModel: "Flat Fee Pricing",
            ChargeType: "Recurring",
            Name: "Basic",
            ProductRatePlanId: productPlan.id,
            TriggerEvent: "ContractEffective",
            UseDiscountSpecificAccountingCode: false,
            ProductRatePlanChargeTierData: {
                ProductRatePlanChargeTier: [{
                    Active: true,
                    Currency: "EUR",
                    Price: productPlan.price
                }]
            }
        }]
    }, zuoraHeaders)
        .then(({data}) => {
            data.forEach(objData => {
                if (objData.Success) {
                    console.log("ZUORA OK");
                } else {
                    console.log("ZUORA ERROR");
                    console.log(objData);
                    context.fail(JSON.stringify({
                        code: "ZuoraError",
                        ...objData
                    }));
                }
            })
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

    const {zuoraHost} = event["stage-variables"];
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
        createProduct(context, businessName, zuoraHost, zuoraHeaders, today, endDate, productPlans);
    }
};