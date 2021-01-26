// Load the SDK
var AWS = require('aws-sdk');
var s3Unzipplus = require('s3-unzip-plus');

// Name of html5 game bucket
const html5GameBucketName = "s3782534-cca2-html5-games";

// Name of dynamodb table with html5 games
const html5GameInfoTableName = "html5_games";

const infoFileKey = "info.json"

exports.handler =  function(event, context, callback){
    console.log(event);
    var requestbody = event;
    var bucketName = requestbody["Records"][0]["s3"]["bucket"]["name"];
    var originalZipName = requestbody["Records"][0]["s3"]["object"]["key"];
    console.log(bucketName);
    var infoParams = {
        Bucket: bucketName,
        Key: infoFileKey,

    };
    var s3 = new AWS.S3({apiVersion: '2006-03-01'});
    s3.getObject(infoParams, function(err, data) {
        if (err){
            console.log(err, err.stack);
            return;
        } else {
            console.log(data);
            var gameInfo = JSON.parse(data.Body);
            var gameName = gameInfo["name"];
            var gameNameZipKey = gameName + "/" + gameName + ".zip";
            console.log(gameNameZipKey);
            var copyParams = {
                Bucket: html5GameBucketName,
                CopySource: (bucketName + "/" + originalZipName),
                Key: gameNameZipKey
            }
            // copy zip into html5 games
            s3.copyObject(copyParams, function(err, data) {
                if (err){
                    console.log(err, err.stack);
                    return;
                } else {
                    console.log(data)
                    // unzip game zip into same s3 bucket
                    new s3Unzipplus({
                        bucket: html5GameBucketName,
                        file: gameNameZipKey,
                        // Docs for module say targetKey, but is actually meant to say targetFolder
                        targetFolder: gameName,
                        deleteOnSuccess: true,
                        verbose: false
                    }, function(err, success){
                        if (err) {
                            console.log(err, err.stack);
                            return;
                        } else {
                            console.log(success);
                            // delete all contents in old bucket
                            //TODO
                            // Add info to database
                            var gameUrl = "https://" + html5GameBucketName + ".s3.us-east-1.amazonaws.com/"// + gameName + "/index.html";
                            var gameUrlParams = {
                                Bucket: html5GameBucketName,
                                Prefix: "index.html",
                                StartAfter: (gameName + "/"),
                            }
                            var data2;
                            s3.listObjectsV2(gameUrlParams, function(err, data){
                                if (err){
                                    console.log(err, err.stack);
                                    return;
                                } else {
                                    data2 = data;
                                }
                            })
                            console.log(data2);
                            var itemParams = {
                                TableName: html5GameInfoTableName,
                                Item: {
                                    "name": {S: gameName},
                                    "game_url": {S: gameUrl}
                                }
                            };
                            var dynamoDb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
                            dynamoDb.putItem(itemParams, function(err, data){
                                if (err){
                                    console.log(err, err.stack);
                                    return;
                                } else {
                                    console.log(data)
                                    return "All success"
                                    //TODO something idk
                                }
                            })
                        }
                    });
                }
            })
            //data
            
        }
    });
    // return "cool";
}