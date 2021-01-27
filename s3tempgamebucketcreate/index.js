// Load the SDK and UUID
var AWS = require('aws-sdk');
var uuid = require('uuid');



// const https = require('https')
// let url = "https://docs.aws.amazon.com/lambda/latest/dg/welcome.html"

exports.handler =  function(event, context, callback) {

    var requestBody = JSON.parse(event.body);

    var gameName;
    if (requestBody["name"]){
        gameName = requestBody["name"];
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
            // Code for cognito credentials, unused for now
            // var identityParams = {IdentityId: 'us-east-1:a10f2f66-d2e1-4330-ba0e-846c95ac63ae'}
            // // console.log("Successfully uploaded data to " + bucketName + "/" + keyName);
            // // var cognitoIdentity = new AWS.CognitoIdentity({apiVersion: '2014-06-30'});
            // // var tempCredentials = cognitoIdentity.getCredentialsForIdentity(identityParams);
            // // tempCredentials.promise().then(function(data){
            // // })

            // var tempCredentials = new AWS.CognitoIdentityCredentials({
            //     IdentityPoolId: 'us-east-1:a10f2f66-d2e1-4330-ba0e-846c95ac63ae',
            // });

            // tempCredentials.refresh()

            // callback(null, {credentials:tempCredentials["cognito"]["config"]["credentials"], bucketName:bucketName});
            // Create url for zip file upload that lasts for 5 mins
            var urlParams = {
                Bucket: bucketName,
                Key: gameName + ".zip",
                Expires: 300,
            }
            var signedUrlPromsie = s3.getSignedUrlPromise('putObject', urlParams);

            signedUrlPromsie.then(function(signedUrl){
                // Get expiry time (time when bucket will be deleted, hour from now)
                var expiryTime = Date.now() + (60*60*1000);
                // Create dynamodb item for submission
                var itemParams = {
                    TableName: "game_temp_upload",
                    Item: {
                        bucket_name: {S: bucketName},
                        expiry_time: {N: expiryTime.toString()},
                        signed_url: {S: signedUrl},
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
                        callback(null, {signedUrl: signedUrl, bucketName:bucketName}) 
                    }
                })   
            }, function(err){
                console.log(err, err.stack);
                callback(Error(err));
            })
        });
    }).catch(
    function(err) {
        console.error(err, err.stack);
        callback(Error(err));
    });

//   https.get(url, (res) => {
//     callback(null, res.statusCode)
//   }).on('error', (e) => {
//     callback(Error(e))
//   })
}

// used to debug locally
// exports.handler({body:JSON.stringify({name:"gameTest"})}, {}, {});

