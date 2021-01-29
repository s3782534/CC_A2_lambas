// Load the SDK
var AWS = require('aws-sdk');
var s3Unzipplus = require('s3-unzip-plus');

// Name of html5 game bucket
const html5GameBucketName = "s3782534-cca2-html5-games";

// Name of dynamodb table with html5 games
const html5GameInfoTableName = "html5_games";

const tempUploadDb = "game_temp_upload"

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
            console.log("Error reading file in bucket")
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
                    console.log("Error copying zip to game folder")
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
                        copyMetadata: true,
                        deleteOnSuccess: true,
                        verbose: false
                    }, function(err, success){
                        if (err) {
                            console.log("Error unzipping zip file")
                            console.log(err, err.stack);
                            return;
                        } else {
                            console.log(success);
                            // delete all contents in old bucket
                            //TODO
                            // Add info to database
                            var gameFileListParams = {
                                Bucket: html5GameBucketName,
                                // Prefix: "index",
                                StartAfter: gameName + "/",
                            }
                            s3.listObjectsV2(gameFileListParams, function(err, data){
                                if (err){
                                    console.log("Error listing objects in game folder")
                                    console.log(err, err.stack);
                                    return;
                                } else {
                                    console.log(data);
                                    var gameIndexKey = "";
                                    var gameImageKey = "";
                                    // search through contents until index and image are found
                                    // var listContents = data["Contents"]
                                    data["Contents"].forEach(function(object) {
                                    // for (var object of listContents){
                                        // console.log(object);
                                        var objectKey = object["Key"];
                                        if (typeof objectKey === "string"){
                                            // console.log("Found key")
                                            var splitKey = objectKey.split('/');
                                            var fileName = splitKey[splitKey.length - 1];
                                            if (fileName === 'index.html'){
                                                gameIndexKey = objectKey;
                                                // if (gameImageKey !== ""){
                                                //     // break;
                                                // }
                                            } else if (fileName === 'favicon.ico'){
                                                gameImageKey = objectKey;
                                            //     if (gameIndexKey !== ""){
                                            //         // break;
                                            //     }
                                            }
                                            var aclParams = {
                                                Bucket: html5GameBucketName,
                                                Key: objectKey,
                                                ACL: "public-read",
                                            }
                                            s3.putObjectAcl(aclParams, function(err, data){
                                                if (err){
                                                    console.log(err, err.stack);
                                                } else{

                                                }
                                            })
                                            // Code to change some metadata, still not enough to work
                                            // TODO look into mime-types module to auto find the content type for files
                                            // var tempFileNameSplit = fileName.split(".");
                                            // var metadata = ""
                                            // var fileNameExtension = tempFileNameSplit[tempFileNameSplit.length - 1];
                                            // if (fileNameExtension === "html"){
                                            //     metadata = "text/html";
                                            // } else if (fileNameExtension === "js"){
                                            //     metadata = "application/javascript";
                                            // } else if (fileNameExtension === "css"){
                                            //     metadata = "text/css";
                                            // }

                                            // if (metadata !== ""){
                                            //     var copyParams = {
                                            //         Bucket: html5GameBucketName,
                                            //         CopySource: (html5GameBucketName + "/" + objectKey),
                                            //         Key: objectKey,
                                            //         // Metadata: {
                                            //         //     '<Content-Type>': metadata
                                            //         // },
                                            //         ContentType: metadata,
                                            //         MetadataDirective: "REPLACE",
                                            //         ACL: "public-read"
                                            //     }
                                            //     s3.copyObject(copyParams, function(err, data){
                                            //         if (err){
                                            //             console.log(err, err.stack);
                                            //         } else {

                                            //         }
                                            //     })
                                            // }
                                        }
                                    })
                                    var itemParams = {
                                        TableName: html5GameInfoTableName,
                                        Item: {
                                            "name": {S: gameName}
                                        }
                                    }
                                    var bucketUrl = "https://" + html5GameBucketName + ".s3.us-east-1.amazonaws.com/"
                                    if (gameIndexKey !== ""){
                                        itemParams["Item"]["game_url"] = {S: bucketUrl + gameIndexKey}
                                    }
                                    if (gameImageKey !== ""){
                                        itemParams["Item"]["icon_url"] = {S: bucketUrl + gameImageKey}
                                    }
                                    var dynamoDb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
                                    dynamoDb.putItem(itemParams, function(err, data){
                                        if (err){
                                            console.log(err, err.stack);
                                            console.log(itemParams);
                                            return;
                                        } else {
                                            console.log(data)
                                            // TODO change status of upload to "completed"
                                            var updateTempParams = {
                                                Key: {
                                                    "bucket_name": {
                                                        S: bucketName
                                                    }
                                                },
                                                TableName: tempUploadDb,
                                                ExpressionAttributeNames: {
                                                    "#S": "status"
                                                },
                                                ExpressionAttributeValues: {
                                                    ":s": {
                                                        S: "completed"
                                                    }
                                                },
                                                UpdateExpression: "SET #S = :s"
                                            }
                                            dynamoDb.updateItem(updateTempParams, function(err, data){
                                                if (err){
                                                    console.log(err, err.stack);
                                                } else {
                                                    // TODO something idk
                                                    return "All success";

                                               }
                                            })
                                        }
                                    })
                                }
                            })
                            
                        }
                    });
                }
            })
            //data
            
        }
    });
    return "cool";
}