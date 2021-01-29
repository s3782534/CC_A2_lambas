// Load the SDK
var AWS = require('aws-sdk');

const tempUploadDb = "game_temp_upload"

exports.handler =  function(event, context) {
    var dynamoDb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

    var scanParams = {
        TableName: tempUploadDb
    }

    var allTempEntries = dynamoDb.scan(scanParams, function(err, data){
        if (err){
            console.log (err, err.stack);
        } else {
            var items = data["Items"];
            for (item of items){
                // variable for tracking if entry and bucket are to be deleted
                var toDelete = false;
                // Check if completed
                if (item["status"] && item["status"]["S"] === "completed"){
                    toDelete = true;
                } else if (item["expiry_time"] && item["expiry_time"]["N"] < Date.now()){
                    toDelete = true;
                }

                // Check if expired

                if (toDelete){
                    var bucketName = item["bucket_name"]["S"];
                    // delete db entry
                    deleteDbEntry(bucketName, dynamoDb);
                    // delete bucket
                    deleteBucket(bucketName);
                    // Return as nothing left to do
                    return;
                }
            }
        }
    })

}

function deleteDbEntry(bucketName, dynamoDb){
    var deleteParams = {
        Key: {
            "bucket_name": {
                S: bucketName
            }
        },
        TableName: tempUploadDb
    }
    dynamoDb.deleteItem(deleteParams, function(err,data){
        if (err){
            console.log("Unsuccessful deletion of db entry");
            return;
        } else {
            console.log("Successful deletion of db entry");
            return;
        }
    })
}

function deleteBucket(bucketName){
    var s3 = new AWS.S3({apiVersion: '2006-03-01'});

    var listParams = {
        Bucket: bucketName
    }
    s3.listObjectsV2(listParams, function(err, data){
        if (err) {
            console.log("Unsuccessful action of listing objects in temp bucket");
            return;
        } else {
            console.log("Successful action of listing objects in temp bucket");
            // Variable to hold object keys for use in deleteObjects request
            var objectKeys = [];
            var objects = data["Contents"];
            // Go through each object and add its key to the deletion pile
            for (object in objects){
                var key = object["Key"];
                objectKeys.push({Key:key});
            }
            var deleteParams = {
                Bucket: bucketName,
                Delete: {
                    Objects: objectKeys
                }
            }
            // Delete all objects in the bucket
            s3.deleteObjects(deleteParams, function(err, data){
                if (err){
                    console.log("Unsuccessful deletion of bucket objects");
                    return;

                } else {
                    console.log("Successful deletion of bucket objects");
                    // Delete the bucket
                    var deleteBucketParams = {
                        Bucket: bucketName
                    }
                    s3.deleteBucket(deleteBucketParams, function (err,data){
                        if (err) {
                            console.log("Unsuccessful deletion of bucket");
                            return;
                        } else {
                            console.log("Successful deletion of bucket objects");
                            return;
                        }
                    })
                }
            })
        }
    })
}