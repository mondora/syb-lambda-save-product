import "babel-polyfill";
import axios from "axios";
import moment from "moment";

//Need this because values of ProductRatePlan (key) are different from ProductRatePlanCharge (value)
const frequencyMapper = {
    "Monthly": "Month",
    "Annual": "Annual",
    "Quarterly": "Quarter"
};

function returnZuoraError(context, object) {
    console.log("ZUORA ERROR");
    console.log(object);
    context.fail(JSON.stringify({
        code: "ZuoraError",
        ...object
    }));
}

function createProduct(context, businessName, zuoraHost, zuoraHeaders, startDate, endDate, productPlans) {
    axios.post(`https://rest.${zuoraHost}/v1/object/product`, {
        Name: businessName,
        Description: "Product created through StartYourBusiness",
        EffectiveEndDate: endDate,
        EffectiveStartDate: startDate
    }, zuoraHeaders)
        .then(({data}) => {
            if (data.Success) {
                console.log("ZUORA OK");
                productPlans.forEach((plan, index) => createProductRatePlan(
                    context,
                    `${businessName}_${index + 1}`,
                    zuoraHost,
                    zuoraHeaders,
                    startDate,
                    endDate,
                    data.Id,
                    plan
                ));
            } else {
                returnZuoraError(context, data);
            }
        })
        .catch(error => returnZuoraError(context, error));
}

function createProductRatePlan(context, ratePlanName, zuoraHost, zuoraHeaders, startDate, endDate, productId, productPlan) {
    let planObj = {
        Name: ratePlanName,
        Description: productPlan.description,
        EffectiveEndDate: endDate,
        EffectiveStartDate: startDate,
        ProductId: productId,
        Frequency__c: productPlan.frequency
    };
    populatePlanFeatures(productPlan, planObj);
    axios.post(`https://rest.${zuoraHost}/v1/action/create`, {
        type: "ProductRatePlan",
        objects: [planObj]
    }, zuoraHeaders)
        .then(({data}) => {
            data.forEach(objData => {
                if (objData.Success) {
                    console.log("ZUORA OK");
                    productPlan.id = objData.Id;
                    createProductRatePlanCharge(context, zuoraHost, zuoraHeaders, productPlan);
                } else {
                    returnZuoraError(context, objData);
                }
            });
        })
        .catch(error => returnZuoraError(context, error));
}

function updateProductRatePlan(context, zuoraHost, zuoraHeaders, productPlan) {
    let planObj = {
        Id: productPlan.productPlanId,
        Description: productPlan.description,
        Frequency__c: productPlan.frequency
    };
    populatePlanFeatures(productPlan, planObj);
    axios.post(`https://rest.${zuoraHost}/v1/action/update`, {
        type: "ProductRatePlan",
        objects: [planObj]
    }, zuoraHeaders)
        .then(({data}) => {
            data.forEach(objData => {
                if (objData.Success) {
                    console.log("ZUORA OK");
                    updateProductRatePlanCharge(context, zuoraHost, zuoraHeaders, productPlan);
                } else {
                    returnZuoraError(context, objData);
                }
            });
        })
        .catch(error => returnZuoraError(context, error));
}

function populatePlanFeatures(productPlan, planObj) {
    if (productPlan.features && Array.isArray(productPlan.features)) {
        for (let i = 0; i < productPlan.features.length && i < 4; i++) {
            planObj[`feature${i+1}__c`] = productPlan.features[i];
        }
    }
}

function createProductRatePlanCharge(context, zuoraHost, zuoraHeaders, productPlan) {
    axios.post(`https://rest.${zuoraHost}/v1/action/create`, {
        type: "ProductRatePlanCharge",
        objects: [{
            BillCycleType: "DefaultFromCustomer",
            BillingPeriod: frequencyMapper[productPlan.frequency],
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
                    returnZuoraError(context, objData);
                }
            });
        })
        .catch(error => returnZuoraError(context, error));
}

function updateProductRatePlanCharge(context, zuoraHost, zuoraHeaders, productPlan) {
    axios.post(`https://rest.${zuoraHost}/v1/action/update`, {
        type: "ProductRatePlanCharge",
        objects: [{
            BillingPeriod: frequencyMapper[productPlan.frequency],
            Id: productPlan.productRatePlanChargeId
        }]
    }, zuoraHeaders)
        .then(({data}) => {
            data.forEach(objData => {
                if (objData.Success) {
                    console.log("ZUORA OK");
                    updateRatePlanChargeTier(context, zuoraHost, zuoraHeaders, productPlan);
                } else {
                    returnZuoraError(context, objData);
                }
            });
        })
        .catch(error => returnZuoraError(context, error));
}

function updateRatePlanChargeTier(context, zuoraHost, zuoraHeaders, productPlan) {
    axios.post(`https://rest.${zuoraHost}/v1/action/update`, {
        type: "RatePlanChargeTier",
        objects: [{
            Price: productPlan.price,
            Id: productPlan.productRatePlanChargeTierId
        }]
    }, zuoraHeaders)
        .then(({data}) => {
            data.forEach(objData => {
                if (objData.Success) {
                    console.log("ZUORA OK");
                } else {
                    returnZuoraError(context, objData);
                }
            });
        })
        .catch(error => returnZuoraError(context, error));
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
    //If starting in the same day Zuora will put plan active on the day after
    const startDate = moment().subtract(1, "days").format("YYYY-MM-DD");
    //TODO think about it
    const endDate = moment().add(20, "years").format("YYYY-MM-DD");

    const {businessName, update, productPlans} = event["body-json"];

    if (update) {
        productPlans.forEach(plan => updateProductRatePlan(context, zuoraHost, zuoraHeaders, plan));
    } else {
        createProduct(context, businessName, zuoraHost, zuoraHeaders, startDate, endDate, productPlans);
    }
};