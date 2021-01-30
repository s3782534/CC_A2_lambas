// Load the SDK and UUID
var AWS = require('aws-sdk');
var uuid = require('uuid');

const tempUploadDb = "game_temp_upload"

const lambdaUnzipArn = "arn:aws:lambda:us-east-1:077477804827:function:gameUnzipAndAddToDbFunction";

exports.handler =  function(event, context, callback) {

    var requestParams = event["queryStringParameters"];

    // TODO add name check (as it is used as primary key)
    var gameName;
    if (requestParams["name"]){
        gameName = requestParams["name"];
    } else {
        // TODO add error handling
        gameName = "Sample Name";
    }

    // AWS.config.region = "us-east-1";

    // Create unique bucket name
    var bucketName = 's3782534-temp-gameupload-' + uuid.v4();
    // Create name for uploaded object key
    var keyName = 'info.json';



    // Create a promise on S3 service object
    var bucketPromise = new AWS.S3({apiVersion: '2006-03-01'}).createBucket({Bucket: bucketName}).promise();

    // Handle promise fulfilled/rejected states
    bucketPromise.then(
    function(data) {
        // Adds request info into file
        var info = {name:gameName};
        // Create params for putObject call
        var objectParams = {Bucket: bucketName, Key: keyName, Body: JSON.stringify(info)};
        var s3 = new AWS.S3({apiVersion: '2006-03-01'});
        // Create object upload promise
        var uploadPromise = s3.putObject(objectParams).promise();
        uploadPromise.then(
        function(data) {
            var autoLambdaParams = {
                Bucket: bucketName,
                NotificationConfiguration: {
                    "LambdaFunctionConfigurations": [
                        {
                            "Id": "triggerUnzip",
                            "LambdaFunctionArn": "arn:aws:lambda:us-east-1:077477804827:function:gameUnzipAndAddToDbFunction",
                            "Events": [
                                "s3:ObjectCreated:*"
                            ],
                            "Filter": {
                                "Key": {
                                    "FilterRules": [
                                        {
                                            "Name": "Prefix",
                                            "Value": ""
                                        },
                                        {
                                            "Name": "Suffix",
                                            "Value": ".zip"
                                        }
                                    ]
                                }
                            }
                        }
                    ]
                }
            };

            s3.putBucketNotificationConfiguration(autoLambdaParams, function(err, data){
            if (err){
                console.log(err, err.stack);
                console.error(err);
                console.log(autoLambdaParams);
                console.log(bucketName);
            } else {
                
            

            var postParams = {
                Bucket: bucketName,
                Fields:{
                    key: "test.zip"
                }
            };
            s3.createPresignedPost(postParams, function(err, postData){
                if (err){
                    console.error('Presigning post data encountered an error', err);
                } else {
                    // Get expiry time (time when bucket will be deleted, hour from now)
                    var expiryTime = Date.now() + (30*60*1000);
                    // Create dynamodb item for submission
                    var itemParams = {
                        TableName: tempUploadDb,
                        Item: {
                            bucket_name: {S: bucketName},
                            expiry_time: {N: expiryTime.toString()},
                            status: {S: "waiting"},
                        }
                    }
                    var dynamoDb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
                    dynamoDb.putItem(itemParams, function(err, data){
                        if (err){
                            console.log(err, err.stack);
                            callback(Error(err));
                        } else {
                            // Return url and bucketname
                            callback(null, postData) 
                        }
                    })   

            }
            }, function(err){
                console.log(err, err.stack);
                callback(Error(err));
            })
            }
        })
        
        })
    }).catch(
    function(err) {
        console.error(err, err.stack);
        callback(Error(err));
    });
}


